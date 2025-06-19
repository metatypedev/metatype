// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Meta } from "../../../engine/runtime.js";
import type {
  AddScheduleInput,
  Backend,
  NextRun,
  Operation,
  ReadOrCloseScheduleInput,
  Run,
} from "../../../engine/runtime.js";
import { getLoggerByAddress, type Logger } from "../../log.ts";
import type { TaskContext } from "../deno/shared_types.ts";
import { getTaskNameFromId } from "../patterns/worker_manager/mod.ts";
import type { EventHandler } from "../patterns/worker_manager/types.ts";
import { hostcall, type HostCallCtx } from "../wit_wire/hostcall.ts";
import {
  checkOperationHasBeenScheduled,
  type InterruptEvent,
  runHasStopped,
  type WorkflowCompletionEvent,
  type WorkflowEvent,
} from "./common.ts";
import { BlockingInterval, WorkerManager } from "./workflow_worker_manager.ts";

export interface StdKwargs {
  taskContext: TaskContext;
  kwargs: Record<string, string>;
}

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
  pollInterval: BlockingInterval;
  hearbeatInterval: BlockingInterval;
  logger: Logger;
  mustLockRunIds: Map<string, Date>;

  constructor(
    public hostcallCtx: HostCallCtx,
    private backend: Backend,
    private queue: string,
    private config: AgentConfig,
  ) {
    this.logger = getLoggerByAddress(import.meta, "substantial");
    this.mustLockRunIds = new Map();

    this.pollInterval = new BlockingInterval(this.logger);
    this.hearbeatInterval = new BlockingInterval(this.logger);
  }

  async schedule(input: AddScheduleInput) {
    await Meta.substantial.storeAddSchedule(input);
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
      this.logger.warn(
        `Failed writing log metadata for schedule "${schedule}" (${runId}), skipping it: ${err}`,
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

    this.logger.warn(
      `Initializing agent to handle ${
        workflows
          .map(({ name }) => name)
          .join(", ")
      }`,
    );

    this.pollInterval.start(1000 * this.config.pollIntervalSec, async () => {
      try {
        await this.#nextIteration();
      } catch (err) {
        this.logger.error(err);
      }
    });

    this.hearbeatInterval.start(
      // Must be smaller than lease lifespan to mitigate
      // expired lease in the middle of an iteration
      1000 * this.config.leaseLifespanSec / 2,
      async () => {
        try {
          await this.#renewLeases();
        } catch (err) {
          this.logger.error(err);
        }
      },
    );
  }

  async stop() {
    await this.workerManager.deinit();
    // TODO: how are we so sure that deinit == worker doing no more work
    await this.pollInterval.kill();
    await this.hearbeatInterval.kill();
  }

  async #nextIteration() {
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
      const requests = this.#selectReplayRequestsFor(
        workflow.name,
        replayRequests,
      );

      while (requests.length > 0) {
        // this.logger.warn(`Run workflow ${JSON.stringify(next)}`);
        const next = requests.shift();
        if (next) {
          try {
            await this.#replay(next, workflow);
          } catch (err) {
            this.logger.error(
              `Replay failed for ${workflow.name} => ${JSON.stringify(next)}`,
            );
            this.logger.error(err);
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

  #selectReplayRequestsFor(workflowName: string, runsInScope: Array<NextRun>) {
    const runsToDo = [];
    for (const run of runsInScope) {
      try {
        if (getTaskNameFromId(run.run_id) == workflowName) {
          runsToDo.push(run);
        }
      } catch (err) {
        this.logger.warn(`Bad runId ${run.run_id}`);
        this.logger.error(err);

        // TODO:
        // Force remove?
      }
    }

    return runsToDo;
  }

  async #tryAcquireNextRun() {
    const activeRunIds = await Meta.substantial.agentActiveLeases({
      backend: this.backend,
      lease_seconds: this.config.leaseLifespanSec,
    });

    this.logger.debug(`Active leases: ${activeRunIds.join(",  ")}`);

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
      this.logger.warn(
        `skip triggering ${next.run_id} for the current tick as it is still ongoing`,
      );

      return;
    }

    return next;
  }

  async #renewLeases() {
    // WARN:
    // There is a subtle race condition that might arise!
    // The renewal interval tick time must be smaller than the lease lifetime so we need to ensure
    // that in the middle of an iteration/a concrete run, the lease does not expire.
    // FIXME: This hearbeat approach does not solve it but rather mitigate it from happening often
    // In an ideal scenario tick time -> 0 is best

    const durationMs = 1000 * this.config.leaseLifespanSec;
    const boundaryMs = durationMs / 3;

    for (const [runId, time] of this.mustLockRunIds) {
      const isRunning = this.workerManager.isOngoing(runId);
      const isAboutToExpire =
        Date.now() >= time.getTime() + durationMs - boundaryMs;

      if (isRunning && isAboutToExpire) {
        this.logger.info(`Renew lease ${runId}, worker is still active`);
        await Meta.substantial.agentRenewLease({
          backend: this.backend,
          lease_seconds: this.config.leaseLifespanSec,
          run_id: runId,
        });
      }

      if (!isRunning) {
        this.mustLockRunIds.delete(runId);
      }
    }
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

    validateRunIntegrity(run);

    if (runHasStopped(run)) {
      // This may occur if an event is sent but the underlying run already completed
      // Or does not exist.

      this.logger.warn(
        `Run ${next.run_id} has already stopped, closing schedule`,
      );
      await Meta.substantial.storeCloseSchedule(schedDef);
      return;
    }

    if (newEventOp && checkOperationHasBeenScheduled(run, newEventOp)) {
      // Also if the scheduled event is already in the log but has not been closed (e.g. a crash before closing it)
      this.logger.warn(
        `Discarding already persisted schedule "${schedDef.schedule}" (${schedDef.run_id}), closing it might have been interrupted after a well-timed crash`,
      );
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
      this.logger.warn(
        `First item in the operation list is not a Start, got "${
          JSON.stringify(
            first,
          )
        }" instead. Closing the underlying schedule.`,
      );

      await Meta.substantial.storeCloseSchedule(schedDef);
      return;
    }

    const { taskContext } = first.event.kwargs as unknown as StdKwargs;
    try {
      await this.workerManager
        .triggerStart(
          workflow.name,
          next.run_id,
          workflow.path,
          run,
          next.schedule_date,
          taskContext,
        )
        .then(() => {
          this.workerManager.listen(
            next.run_id,
            this.#eventResultHandlerFor(workflow.name, next.run_id),
          );
          this.mustLockRunIds.set(next.run_id, new Date());
        });
    } catch (err) {
      throw err;
    } finally {
      if (run.operations.length == 1) {
        // Make sure it is already visible on the ongoing list
        // without waiting for interrupts to store the first run
        this.logger.info(`Persist first run "${next.run_id}"`);
        await Meta.substantial.storePersistRun({
          backend: this.backend,
          run,
        });
      }
    }
  }

  #eventResultHandlerFor(
    workflowName: string,
    runId: string,
  ): EventHandler<WorkflowEvent> {
    return async (event) => {
      const startedAt = this.workerManager.getInitialTimeStartedAt(runId);

      switch (event.type) {
        case "HOSTCALL": {
          let result;
          let error;
          try {
            result = await hostcall(this.hostcallCtx, event.opName, event.json);
          } catch (err) {
            error = err;
          }
          this.workerManager.sendMessage(runId, {
            type: "HOSTCALL_RESP",
            id: event.id,
            result,
            error,
          });
          break;
        }
        case "SUCCESS":
        case "FAIL":
          await this.#workflowHandleGracefullCompletion(
            startedAt,
            workflowName,
            runId,
            event,
          );
          break;
        case "ERROR":
          this.logger.error(
            `Result error for "${runId}": ${JSON.stringify(event.error)}`,
          );
          return;
        case "INTERRUPT":
          // TODO unknown interrupt
          await this.#workflowHandleInterrupts(workflowName, runId, event);
          break;
      }

      // this.logger.info(
      //   `"${runId}" answered: type ${JSON.stringify(answer.type)}`,
      // );
    };
  }

  async #workflowHandleInterrupts(
    workflowName: string,
    runId: string,
    { interrupt, schedule, run }: InterruptEvent,
  ) {
    this.workerManager.deallocateWorker(workflowName, runId); // !

    this.logger.debug(`Interrupt "${workflowName}": ${interrupt}"`);

    // TODO: make all of these transactional

    this.logger.info(`Persist records for "${workflowName}": ${interrupt}"`);
    const _run = await Meta.substantial.storePersistRun({
      backend: this.backend,
      run,
    });

    try {
      this.logger.info(`Trying to close old schedule ${runId} at ${schedule}`);
      await Meta.substantial.storeCloseSchedule({
        backend: this.backend,
        queue: this.queue,
        run_id: runId,
        schedule,
      });
    } catch (err) {
      // Note: underlying schedule may have been closed already
      // This could occur if multiple events were sent at the exact same time
      this.logger.warn(err);
    }

    const newSchedule = new Date().toJSON();
    this.logger.info(`Add back to schedule ${runId} at ${newSchedule}`);
    await Meta.substantial.storeAddSchedule({
      backend: this.backend,
      queue: this.queue,
      run_id: runId,
      schedule: newSchedule,
    });
  }

  async #workflowHandleGracefullCompletion(
    startedAt: Date,
    workflowName: string,
    runId: string,
    event: WorkflowCompletionEvent,
  ) {
    this.workerManager.deallocateWorker(workflowName, runId);

    const result = event.type == "SUCCESS" ? event.result : event.error;

    this.logger.info(
      `gracefull completion of "${runId}" (${event.type}): ${
        JSON.stringify(
          result,
        )
      } started at "${startedAt}"`,
    );

    this.logger.info(`Append Stop ${runId}`);
    const rustResult = event.type == "FAIL" ? "Err" : "Ok";

    // Note: run is a one-time value, thus can be mutated

    const stopSched = {
      at: new Date().toJSON(),
      event: {
        type: "Stop",
        result: {
          [rustResult]: result,
        } as unknown,
      },
    } satisfies Operation;
    const discardSchedule = runHasStopped(event.run) ||
      checkOperationHasBeenScheduled(event.run, stopSched);

    if (!discardSchedule) {
      event.run.operations.push(stopSched);
    }

    this.logger.info(
      `Persist finalized records for "${workflowName}": ${result}" and closing everything..`,
    );

    const _run = await Meta.substantial.storePersistRun({
      backend: this.backend,
      run: event.run,
    });

    await Meta.substantial.storeCloseSchedule({
      backend: this.backend,
      queue: this.queue,
      run_id: runId,
      schedule: event.schedule,
    });

    await Meta.substantial.agentRemoveLease({
      backend: this.backend,
      run_id: runId,
      lease_seconds: this.config.leaseLifespanSec,
    });
  }
}

function prettyRun(run: Run) {
  return JSON.stringify(
    run.operations.map(({ event, at }) => ({ type: event.type, at })),
  );
}

function validateRunIntegrity(run: Run) {
  const logger = getLoggerByAddress(import.meta, "substantial");

  let life = 0;

  for (const op of run.operations) {
    if (op.event.type == "Start") {
      if (life >= 1) {
        logger.error(`bad logs: ${prettyRun(run)}`);

        throw new Error(
          `"${run.run_id}" has potentially corrupted logs, another run occured yet previous has not stopped`,
        );
      }

      life += 1;
    } else if (op.event.type == "Stop") {
      if (life <= 0) {
        logger.error(`bad logs: ${prettyRun(run)}`);

        throw new Error(
          `"${run.run_id}" has potentitally corrupted logs, attempted stopping already closed run, or run with a missing Start`,
        );
      }

      life -= 1;
    }
  }
}
