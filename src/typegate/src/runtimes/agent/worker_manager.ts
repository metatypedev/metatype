import { envSharedWithWorkers } from "../../config/shared.ts";
import { getLogger } from "../../log.ts";
import {
  Err,
  Msg,
  Result,
  WorkerEvent,
  WorkerEventHandler,
} from "../substantial/types.ts";

const logger = getLogger(import.meta, "WARN");

export type TaskId = string;
export type TaskName = string;

export type WorkerRecord = {
  worker: Worker;
  modulePath: string;
};

export type Task = {
  id: TaskId;
  name: TaskName;
  modulePath: string; //
  functionName: string;
};

// export class TaskRecorder {
//   runs: Map<TaskName, Set<TaskId>> = new Map();
//   workers: Map<TaskId, WorkerRecord> = new Map();
//   startedAtRecords: Map<TaskId, Date> = new Map();
//
//   getRegisteredTaskNames() {
//     return Array.from(this.runs.keys());
//   }
//
//   hasTask(taskId: TaskId) {
//     return this.workers.has(taskId);
//   }
//
//   getWorkerRecord(taskId: TaskId) {
//     const record = this.workers.get(taskId);
//     if (!record) {
//       throw new Error(`Task "${taskId}" does not exist or has been completed`);
//     }
//
//     return record!;
//   }
//
//   addWorker(
//     name: TaskName,
//     taskId: TaskId,
//     worker: WorkerRecord,
//     startedAt: Date,
//   ) {
//     if (!this.runs.has(name)) {
//       this.runs.set(name, new Set());
//     }
//     this.runs.get(name)!.add(taskId);
//     this.workers.set(taskId, worker);
//     if (!this.startedAtRecords.has(taskId)) {
//       this.startedAtRecords.set(taskId, startedAt);
//     }
//   }
//
//   destroyAllWorkers() {
//     for (const taskId of this.workers.keys()) {
//       this.destroyWorker(taskId);
//     }
//   }
//
//   destroyRelatedWorkers(name: TaskName) {
//     if (this.runs.has(name)) {
//       const taskIds = this.runs.get(name)!.values();
//       for (const taskId of taskIds) {
//         this.destroyWorker(name, taskId);
//       }
//       return true;
//     }
//     return false;
//   }
//
//   // why 2 args? isn't taskId enough?
//   destroyWorker(name: TaskName, taskId: TaskId) {
//     const record = this.workers.get(taskId);
//
//     if (this.runs.has(name)) {
//       if (!record) {
//         logger.warn(`Task "${taskId}" does not exist or has been completed`);
//         return false;
//       }
//
//       record.worker.terminate();
//       this.runs.get(name)!.delete(taskId);
//       this.workers.delete(taskId);
//
//       return true;
//     }
//     return false;
//   }
// }

export abstract class BaseWorker<InMessage, OutMessage> {
  abstract sendMessage(message: InMessage): void;
  abstract listen(handler: (message: OutMessage) => void): void;
  abstract destroy(): void;
}

export type TaskResolver = (value: unknown) => void;

export type WorkerState = {
  worker: Worker;
  currentTaskId: TaskId | null;
};

export interface TaskBase {
  id: TaskId;
  name: TaskName;
}

type QueueItem<TTask extends TaskBase> = {
  task: TTask;
  createdAt: Date;
  resolver: TaskResolver;
};

export class BaseWorkerManager<TTask extends TaskBase, InMessage, OutMessage> {
  #maxWorkers: number;
  #activeTasks: Map<TaskId, {
    startedAt: Date;
    task: TTask;
    worker: BaseWorker<InMessage, OutMessage>;
    resolver: TaskResolver;
  }> = new Map();
  #idleWorkers: Array<BaseWorker<InMessage, OutMessage>> = [];
  // private recorder = new TaskRecorder();
  #workerFactory: (id: string) => BaseWorker<InMessage, OutMessage>;
  #taskQueue: Array<QueueItem<TTask>> = [];

  protected constructor(
    factory: () => BaseWorker<InMessage, OutMessage>,
    maxWorkers: number = 16,
  ) {
    this.#workerFactory = factory;
    this.#maxWorkers = maxWorkers;
  }

  #assignWorker(task: TTask, resolver: TaskResolver) {
    const worker = this.#idleWorkers.pop() ??
      this.#workerFactory(crypto.randomUUID());
    worker.listen((message) => {
      resolver(message);
      this.#activeTasks.delete(task.id);
      this.#idleWorkers.push(worker);
      this.#processQueue();
    });
    worker.sendMessage(task);
    this.#activeTasks.set(task.id, {
      startedAt: new Date(),
      task,
      worker,
      resolver,
    });
  }

  protected createWorker(task: Task) {
    const worker = this.#workerFactory();

    this.recorder.addWorker(
      task.name,
      task.id,
      { worker, modulePath: task.modulePath },
      new Date(),
    );
  }

  // idem
  destroyWorker(name: TaskName, taskId: TaskId) {
    return this.recorder.destroyWorker(name, taskId);
  }

  destroyAllWorkers() {
    this.recorder.destroyAllWorkers();
    logger.warn(
      `Destroyed workers for ${
        this.recorder.getRegisteredTaskNames().map((w) => `"${w}"`).join(", ")
      }`,
    );
  }

  isOngoing(taskId: TaskId) {
    return this.recorder.hasTask(taskId);
  }

  getAllocatedResources(name: TaskName) {
    const taskIds = this.recorder.runs.get(name) ?? new Set<string>();
    return {
      count: taskIds.size,
      task: name, // workflow
      running: Array.from(taskIds).map((taskId) => {
        return {
          task_id: taskId,
          started_at: this.recorder.startedAtRecords.get(taskId),
        };
      }),
    };
  }

  getInitialTimeStartedAt(taskId: TaskId) {
    const rec = this.recorder.startedAtRecords.get(taskId);
    if (!rec) {
      throw new Error(
        `Invalid state: cannot find initial time for task "${taskId}"`,
      );
    }
    return rec;
  }

  listen(taskId: TaskId, handlerFn: WorkerEventHandler) {
    if (!this.recorder.hasTask(taskId)) {
      logger.warn(`Attempt to listen to a non-existent task ${taskId}`);
      return;
    }
    const { worker } = this.recorder.getWorkerRecord(taskId);

    worker.onmessage = async (message) => {
      if (message.data.error) {
        // worker level failure
        await handlerFn(Err(message.data.error));
      } else {
        // logic level Result (Ok | Err)
        await handlerFn(message.data as Result<unknown>);
      }
    };

    worker.onerror = (event) => handlerFn(Err(event));
  }

  // TODO type?? -- depends on the worker
  trigger(type: E, taskId: TaskId, data: unknown) {
    const { worker } = this.recorder.getWorkerRecord(taskId);
    // TODO as any??
    worker.postMessage(Msg(type as any, data));
    logger.info(`trigger ${type} for ${taskId}`);
  }
}
