import {
  AddScheduleInput,
  Backend,
  NextRun,
  Run,
} from "../../../engine/runtime.js";
import { getLogger } from "../../log.ts";
import { sleep } from "../../utils.ts";
import {
  Interrupt,
  Operation,
  Result,
  WorkerData,
  WorkflowResult,
} from "./types.ts";
import { RunId, WorkerManager } from "./workflow_worker_manager.ts";

const logger = getLogger();

export interface WorkflowDescription {
  name: string;
  path: string;
  kind: "DENO" | "PYTHON";
}

export interface StagedUserEvent {
  runId: string;
  operation: Operation;
}

export interface AgentConfig {
  poll_interval_sec: number;
  lease_lifespan_sec: number;
}

export class Agent {
  workerManager = new WorkerManager();
  workflows: Array<WorkflowDescription> = [];
  pollIntervalHandle?: number;

  constructor(
    private backend: Backend,
    private queue: string,
    private config: AgentConfig
  ) {}

  async schedule(input: AddScheduleInput) {
    await Meta.substantial.storeAddSchedule(input);
  }

  async log(runId: string, schedule: string, content: unknown) {
    await Meta.substantial.metadataAppend({
      backend: this.backend,
      schedule,
      run_id: runId,
      content,
    });
  }

  async link(workflowName: string, runId: string) {
    await Meta.substantial.metadataWriteWorkflowLink({
      backend: this.backend,
      run_id: runId,
      workflow_name: workflowName,
    });
  }

  async retrieveLinks(workflowName: string) {
    return await Meta.substantial.metadataReadWorkflowLinks({
      backend: this.backend,
      workflow_name: workflowName,
    });
  }

  async retrieveEvents(runId: string): Promise<Run> {
    const { run } = await Meta.substantial.storeCreateOrGetRun({
      backend: this.backend,
      run_id: runId,
    });

    return run;
  }

  start(workflows: Array<WorkflowDescription>) {
    this.workflows = workflows;

    logger.warn(
      `Initializing agent to handle ${workflows
        .map(({ name }) => name)
        .join(", ")}`
    );

    this.pollIntervalHandle = setInterval(async () => {
      try {
        await this.#nextIteration();
      } catch (err) {
        logger.error(err);
      }
    }, 1000 * this.config.poll_interval_sec);
  }

  stop() {
    this.workerManager.destroyAllWorkers();
    if (this.pollIntervalHandle !== undefined) {
      clearInterval(this.pollIntervalHandle);
    }
  }

  async #nextIteration() {
    logger.warn("POLL");
    const next = await this.#tryAcquireNextRun();

    for (const workflow of this.workflows) {
      if (next && Agent.parseWorkflowName(next.run_id) == workflow.name) {
        // logger.warn(`Run workflow ${JSON.stringify(next)}`);

        await this.log(next.run_id, next.schedule_date, {
          message: "Replay workflow",
          next,
        });

        await this.#replay(next, workflow);
        return;
      }
    }
  }

  async #tryAcquireNextRun() {
    const activeRunIds = await Meta.substantial.agentActiveLeases({
      backend: this.backend,
      lease_seconds: this.config.lease_lifespan_sec,
    });

    logger.info(`Active leases: ${activeRunIds.join(",  ")}`);

    const next = await Meta.substantial.agentNextRun({
      backend: this.backend,
      queue: this.queue,
      exclude: activeRunIds,
    });

    if (!next) {
      return;
    }

    const acquired = await Meta.substantial.agentAcquireLease({
      backend: this.backend,
      lease_seconds: this.config.lease_lifespan_sec,
      run_id: next.run_id,
    });

    if (!acquired) {
      return;
    }

    // Leases are for abstracting ongoing runs, and at a given tick, does not
    // necessarily represent the state of what is actually running on the current typegate node
    if (this.workerManager.isOngoing(next.run_id)) {
      logger.warn(
        `skip triggering ${next.run_id} for the current tick as it is still ongoing`
      );

      return;
    }

    return next;
  }

  async #replay(next: NextRun, workflow: WorkflowDescription) {
    const { run } = await Meta.substantial.storeCreateOrGetRun({
      backend: this.backend,
      run_id: next.run_id,
    });

    const schedDef = {
      backend: this.backend,
      queue: this.queue,
      run_id: next.run_id,
      workflow_name: workflow.name,
      schedule: next.schedule_date,
    };
    const newEventOp = await Meta.substantial.storeReadSchedule(schedDef);

    if (checkIfRunHasStopped(run)) {
      // This may occur if an event is sent but the underlying run already completed
      // Or does not exist.
      logger.warn(`Run ${next.run_id} has already stopped, closing schedule`);
      await Meta.substantial.storeCloseSchedule(schedDef);
      return;
    }

    if (newEventOp) {
      run.operations.push(newEventOp);
    }

    if (run.operations.length == 0) {
      // This should not be possible since gql { start(..) } => writes a Start event on the backend
      throw new Error(`Invalid state: no scheduled operation on the backend`);
    }

    const first = run.operations[0];
    if (first.event.type != "Start") {
      // A consequence of the above, a workflow is always triggered by gql { start(..) }
      // This can also occur if an event is sent from gql under a runId that is not valid (e.g. due to typo)
      logger.warn(
        `First item in the operation list is not a Start, got "${JSON.stringify(
          first
        )}" instead. Closing the underlying schedule.`
      );

      await Meta.substantial.storeCloseSchedule(schedDef);
      return;
    }

    this.workerManager.triggerStart(
      workflow.name,
      next.run_id,
      workflow.path,
      run,
      next.schedule_date,
      first.event.kwargs
    );

    this.workerManager.listen(
      next.run_id,
      this.#eventResultHandlerFor(workflow.name, next.run_id)
    );
  }

  #eventResultHandlerFor(workflowName: string, runId: string) {
    return async (result: Result<unknown>) => {
      if (result.error) {
        // All Worker/Runner non-user issue should fall here
        // Note: Should never throw (typegate will panic), this will run in a worker
        logger.error(
          `result error for "${runId}": ${JSON.stringify(result.payload)}`
        );
        return;
      }

      const answer = result.payload as WorkerData;
      logger.info(`"${runId}" answered: type ${JSON.stringify(answer.type)}`);

      const startedAt = this.workerManager.getInitialTimeStartedAt(runId);

      switch (answer.type) {
        case "START": {
          const ret = answer.data as WorkflowResult;
          switch (Interrupt.getTypeOf(ret.exception)) {
            case "SLEEP":
            case "WAIT_ENSURE_VALUE":
            case "WAIT_HANDLE_EVENT":
            case "WAIT_RECEIVE_EVENT": {
              await this.#workflowHandleInterrupts(workflowName, runId, ret);
              break;
            }
            default: {
              await this.#workflowHandleGracefullCompletion(
                startedAt,
                workflowName,
                runId,
                ret
              );
            }
          }
          break;
        }
        default:
          logger.error(
            `Fatal: invalid type ${
              answer.type
            } sent by "${runId}": ${JSON.stringify(answer.data)}`
          );
      }
    };
  }

  async #workflowHandleInterrupts(
    workflowName: string,
    runId: string,
    { result, schedule, run }: WorkflowResult
  ) {
    this.workerManager.destroyWorker(workflowName, runId); // !

    logger.warn(`Interrupt "${workflowName}": ${result}"`);

    // TODO: make all of these transactional

    logger.info(`Persist records for "${workflowName}": ${result}"`);
    const _run = await Meta.substantial.storePersistRun({
      backend: this.backend,
      run,
    });

    try {
      logger.info(`Trying to close old schedule ${runId} at ${schedule}`);
      await Meta.substantial.storeCloseSchedule({
        backend: this.backend,
        queue: this.queue,
        run_id: runId,
        schedule,
      });
    } catch (err) {
      // Note: underlying schedule may have been closed already
      // This could occur if multiple events were sent at the exact same time
      logger.warn(err);
    }

    const newSchedule = new Date().toJSON();
    logger.info(`Add back to schedule ${runId} at ${newSchedule}`);
    await Meta.substantial.storeAddSchedule({
      backend: this.backend,
      queue: this.queue,
      run_id: runId,
      schedule: newSchedule,
    });

    logger.info(`Renew lease ${runId}`);
    await Meta.substantial.agentRenewLease({
      backend: this.backend,
      lease_seconds: this.config.lease_lifespan_sec,
      run_id: runId,
    });
  }

  async #workflowHandleGracefullCompletion(
    startedAt: Date,
    workflowName: string,
    runId: string,
    { result, kind, schedule, run }: WorkflowResult
  ) {
    this.workerManager.destroyWorker(workflowName, runId);

    logger.info(
      `gracefull completion of "${runId}" (${kind}): ${JSON.stringify(
        result
      )} started at "${startedAt}"`
    );

    logger.info(`Append Stop ${runId}`);
    const rustResult = kind == "FAIL" ? "Err" : "Ok";
    run.operations.push({
      // Note: run is a one-time value, thus can be mutated
      at: new Date().toJSON(),
      event: {
        type: "Stop",
        result: {
          [rustResult]: result,
        } as unknown,
      },
    });

    logger.info(
      `Persist finalized records for "${workflowName}": ${result}" and closing everything..`
    );

    const _run = await Meta.substantial.storePersistRun({
      backend: this.backend,
      run,
    });

    await Meta.substantial.storeCloseSchedule({
      backend: this.backend,
      queue: this.queue,
      run_id: runId,
      schedule,
    });

    await Meta.substantial.agentRemoveLease({
      backend: this.backend,
      run_id: runId,
      lease_seconds: this.config.lease_lifespan_sec,
    });
  }

  static nextId(name: string): RunId {
    const uuid = crypto.randomUUID();
    return `${name}_::_${uuid}`;
  }

  static parseWorkflowName(runId: string) {
    const [name, uuid] = runId.split("_::_");
    if (!name && !uuid) {
      // Impossible since it must be produced from nextId upon a Start event
      throw new Error(`Fatal: ${runId} does not respect the convention`);
    }

    return name;
  }
}

function checkIfRunHasStopped(run: Run) {
  let life = 0;
  let hasStopped = false;
  for (const op of run.operations) {
    if (op.event.type == "Start") {
      if (life >= 1) {
        logger.error(
          `bad logs: ${JSON.stringify(
            run.operations.map(({ event }) => event.type)
          )}`
        );

        throw new Error(
          `"${run.run_id}" has potentially corrupted logs, another run occured yet previous has not stopped`
        );
      }
      life += 1;
      hasStopped = false;
    } else if (op.event.type == "Stop") {
      if (life <= 0) {
        logger.error(
          `bad logs: ${JSON.stringify(
            run.operations.map(({ event }) => event.type)
          )}`
        );

        throw new Error(
          `"${run.run_id}" has potentitally corrupted logs, attempted stopping already closed run, or run with a missing Start`
        );
      }
      life -= 1;
      hasStopped = true;
    }
  }

  return hasStopped;
}
