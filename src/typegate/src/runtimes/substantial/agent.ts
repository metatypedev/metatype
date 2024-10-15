import {
  AddScheduleInput,
  Backend,
  NextRun,
  Run,
  ReadOrCloseScheduleInput,
} from "../../../engine/runtime.js";
import { getLogger } from "../../log.ts";
import { TaskContext } from "../deno/shared_types.ts";
import {
  Interrupt,
  Result,
  WorkerData,
  WorkflowResult,
  appendIfOngoing,
} from "./types.ts";
import { RunId, WorkerManager } from "./workflow_worker_manager.ts";

const logger = getLogger();

export interface WorkflowDescription {
  name: string;
  path: string;
  kind: "DENO" | "PYTHON";
}

export interface AgentConfig {
  pollIntervalSec: number;
  leaseLifespanSec: number;
  maxAcquirePerTick: number;
}

export class Agent {
  workerManager = new WorkerManager();
  workflows: Array<WorkflowDescription> = [];
  pollIntervalHandle?: number;

  constructor(
    private backend: Backend,
    private queue: string,
    private config: AgentConfig,
    private internalTCtx: TaskContext
  ) {}

  async schedule(input: AddScheduleInput) {
    await Meta.substantial.storeAddSchedule(input);
  }

  async reScheduleNow(input: NextRun) {
    const relatedEvent = await Meta.substantial.storeReadSchedule({
      backend: this.backend,
      queue: this.queue,
      run_id: input.run_id,
      schedule: input.schedule_date,
    });

    if (relatedEvent) {
      await this.schedule({
        backend: this.backend,
        queue: this.queue,
        run_id: input.run_id,
        schedule: new Date().toJSON(),
        operation: relatedEvent,
      });
    } else {
      // This could occur if it was closed or never existed (inconsistent state)
      logger.error(
        `Failed reschedule: could not find related event for ${JSON.stringify(
          input
        )}`
      );
    }
  }

  async log(runId: string, schedule: string, content: unknown) {
    try {
      await Meta.substantial.metadataAppend({
        backend: this.backend,
        schedule,
        run_id: runId,
        content,
      });
    } catch (err) {
      logger.warn(
        `Failed writing log metadata for schedule "${schedule}" (${runId}), skipping it: ${err}`
      );
    }
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
    }, 1000 * this.config.pollIntervalSec);
  }

  stop() {
    this.workerManager.destroyAllWorkers();
    if (this.pollIntervalHandle !== undefined) {
      clearInterval(this.pollIntervalHandle);
    }
  }

  async #nextIteration() {
    logger.warn("POLL");

    // Note: in multiple agents/typegate scenario, a single node may acquire all runs for itself within a tick span
    // To account for that, keep this reasonable
    const acquireMaxForThisAgent = this.config.maxAcquirePerTick;
    const replayRequests = [] as Array<NextRun>;
    const runIdSeen = new Set<string>();

    while (replayRequests.length <= acquireMaxForThisAgent) {
      const next = await this.#tryAcquireNextRun();
      if (next && !runIdSeen.has(next.run_id)) {
        replayRequests.push(next);
        // we cannot start more than 1 worker associated to a runId
        runIdSeen.add(next.run_id);
      } else {
        break;
      }
    }

    for (const workflow of this.workflows) {
      const requests = replayRequests.filter(
        ({ run_id }) => Agent.parseWorkflowName(run_id) == workflow.name
      );

      while (requests.length > 0) {
        // logger.warn(`Run workflow ${JSON.stringify(next)}`);
        const next = requests.shift();
        if (next) {
          try {
            await this.#replay(next, workflow);
          } catch (err) {
            logger.error(
              `Replay failed for ${workflow.name} => ${JSON.stringify(
                next
              )}: rescheduling it.`
            );
            logger.error(err);

            await this.reScheduleNow(next);
          } finally {
            await this.log(next.run_id, next.schedule_date, {
              message: "Replaying workflow",
              next,
            });
          }
        }
      }
    }
  }

  async #tryAcquireNextRun() {
    const activeRunIds = await Meta.substantial.agentActiveLeases({
      backend: this.backend,
      lease_seconds: this.config.leaseLifespanSec,
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
      lease_seconds: this.config.leaseLifespanSec,
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
      schedule: next.schedule_date,
    } satisfies ReadOrCloseScheduleInput;
    const newEventOp = await Meta.substantial.storeReadSchedule(schedDef);

    if (checkIfRunHasStopped(run)) {
      // This may occur if an event is sent but the underlying run already completed
      // Or does not exist.
      logger.warn(`Run ${next.run_id} has already stopped, closing schedule`);
      await Meta.substantial.storeCloseSchedule(schedDef);
      return;
    }

    if (newEventOp) {
      appendIfOngoing(run, newEventOp);
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

    try {
      this.workerManager.triggerStart(
        workflow.name,
        next.run_id,
        workflow.path,
        run,
        next.schedule_date,
        first.event.kwargs,
        this.internalTCtx
      );

      this.workerManager.listen(
        next.run_id,
        this.#eventResultHandlerFor(workflow.name, next.run_id)
      );
    } catch (err) {
      throw err;
    } finally {
      if (run.operations.length == 1) {
        // Make sure it is already visible on the ongoing list
        // without waiting for interrupts to store the first run
        logger.info(`Persist first run "${next.run_id}"`);
        await Meta.substantial.storePersistRun({
          backend: this.backend,
          run,
        });
      }
    }
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
          const interrupt = Interrupt.getTypeOf(ret.exception);
          switch (interrupt) {
            case "SAVE_RETRY":
            case "SLEEP":
            case "WAIT_ENSURE_VALUE":
            case "WAIT_HANDLE_EVENT":
            case "WAIT_RECEIVE_EVENT": {
              await this.#workflowHandleInterrupts(workflowName, runId, ret);
              break;
            }
            case null: {
              await this.#workflowHandleGracefullCompletion(
                startedAt,
                workflowName,
                runId,
                ret
              );
              break;
            }
            default:
              throw new Error(`Unknown interrupt "${interrupt}"`);
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
      lease_seconds: this.config.leaseLifespanSec,
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

    // Note: run is a one-time value, thus can be mutated

    appendIfOngoing(run, {
      at: new Date().toJSON(),
      event: {
        type: "Stop",
        result: {
          [rustResult]: result ?? null,
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

    // console.log("Persisted", run);

    await Meta.substantial.storeCloseSchedule({
      backend: this.backend,
      queue: this.queue,
      run_id: runId,
      schedule,
    });

    await Meta.substantial.agentRemoveLease({
      backend: this.backend,
      run_id: runId,
      lease_seconds: this.config.leaseLifespanSec,
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
