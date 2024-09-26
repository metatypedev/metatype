// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "./Runtime.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { ComputeStage } from "../engine/query_engine.ts";
import { TypeGraph, TypeMaterializer } from "../typegraph/mod.ts";
import { registerRuntime } from "./mod.ts";
import { getLogger, Logger } from "../log.ts";
import * as ast from "graphql/ast";
import { path } from "compress/deps.ts";
import { Artifact, Materializer } from "../typegraph/types.ts";
import { Typegate } from "../typegate/mod.ts";
import { Backend } from "../../engine/runtime.js";
import { Agent, WorkflowDescription } from "./substantial/agent.ts";

const logger = getLogger(import.meta);

interface QueryCompletedWorkflowResult {
  run_id: string;
  started_at: string;
  ended_at: string;
  result: {
    status: "COMPLETED" | "COMPLETED_WITH_ERROR" | "UNKNOWN";
    value: unknown; // hinted by the user
  };
}

type QueryOngoingWorkflowResult = Omit<
  QueryCompletedWorkflowResult,
  "result" | "ended_at"
>;

@registerRuntime("substantial")
export class SubstantialRuntime extends Runtime {
  private logger: Logger;
  private backend: Backend;
  private workflowFiles: Map<string, string> = new Map();

  private agent: Agent;
  private queue: string;

  private constructor(
    typegraphName: string,
    backend: Backend,
    queue: string,
    agent: Agent
  ) {
    super(typegraphName);
    this.logger = getLogger(`substantial:'${typegraphName}'`);
    this.backend = backend;
    this.queue = queue;
    this.agent = agent;
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    logger.info("initializing SubstantialRuntime");
    logger.debug(`init params: ${JSON.stringify(params)}`);
    const {
      typegraph: tg,
      args,
      materializers,
      secretManager,
      typegate,
    } = params;

    const secrets: Record<string, string> = {};

    for (const m of materializers) {
      for (const secretName of (m.data.secrets as []) ?? []) {
        secrets[secretName] = secretManager.secretOrFail(secretName);
      }
    }

    const tgName = TypeGraph.formatName(tg);
    const backend = (args as any)!.backend as Backend;
    if (backend.type == "redis") {
      backend.connection_string = secretManager.secretOrFail(
        backend.connection_string
      );
    }

    const queue = "default";

    // Prepare the backend event poller
    const agent = new Agent(backend, queue, {
      poll_interval_sec: typegate.config.base.substantial_poll_interval_sec,
      lease_lifespan_sec: typegate.config.base.substantial_lease_lifespan_sec,
    });

    const wfDescriptions = await getWorkflowDescriptions(
      tgName,
      tg.meta.artifacts,
      materializers,
      typegate
    );

    agent.start(wfDescriptions);

    // Prepare the runtime
    const instance = new SubstantialRuntime(tgName, backend, queue, agent);
    await instance.#prepareWorkflowFiles(
      tg.meta.artifacts,
      materializers,
      typegate
    );

    return instance;
  }

  deinit(): Promise<void> {
    logger.info("deinitializing SubstantialRuntime");
    this.agent.stop();
    return Promise.resolve();
  }

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean
  ): ComputeStage[] {
    if (stage.props.node === "__typename") {
      return [
        stage.withResolver(() => {
          const { parent: parentStage } = stage.props;
          if (parentStage != null) {
            return parentStage.props.outType.title;
          }
          switch (stage.props.operationType) {
            case ast.OperationTypeNode.QUERY:
              return "Query";
            case ast.OperationTypeNode.MUTATION:
              return "Mutation";
            default:
              throw new Error(
                `Unsupported operation type '${stage.props.operationType}'`
              );
          }
        }),
      ];
    }

    if (stage.props.outType.config?.__namespace) {
      return [stage.withResolver(() => ({}))];
    }

    if (stage.props.materializer != null) {
      return [stage.withResolver(this.#delegate(stage.props.materializer))];
    }

    return [
      stage.withResolver(({ _: { parent } }) => {
        if (stage.props.parent == null) {
          // namespace
          return {};
        }
        const resolver = parent[stage.props.node];
        return typeof resolver === "function" ? resolver() : resolver;
      }),
    ];
  }

  #delegate(mat: TypeMaterializer): Resolver {
    const matName = mat.name;
    const data = mat?.data ?? {};
    const workflowName = data.name as string;

    switch (matName) {
      case "start":
        return this.#startResolver(workflowName);
      case "stop":
        return this.#stopResolver();
      case "send":
        return this.#sendResolver();
      case "resources":
        return () => {
          const res =
            this.agent.workerManager.getAllocatedResources(workflowName);
          return JSON.parse(JSON.stringify(res));
        };
      case "results":
        return this.#resultsResover(workflowName);
      default:
        return () => null;
    }
  }

  #startResolver(workflowName: string): Resolver {
    return async ({ kwargs }) => {
      const runId = Agent.nextId(workflowName);
      const schedule = new Date().toJSON();

      await this.agent.schedule({
        backend: this.backend,
        queue: this.queue,
        run_id: runId,
        schedule,
        operation: {
          at: schedule,
          event: {
            type: "Start",
            kwargs,
          },
        },
      });

      await this.agent.link(workflowName, runId);

      // TODO: return { workflow_name, run_id, schedule } instead
      return runId;
    };
  }

  #resultsResover(workflowName: string): Resolver {
    return async () => {
      const relatedRuns = await this.agent.retrieveLinks(workflowName);
      const ongoing = [] as Array<QueryOngoingWorkflowResult>;
      const completed = [] as Array<QueryCompletedWorkflowResult>;
      for (const runId of relatedRuns) {
        const run = await this.agent.retrieveEvents(runId);
        const startedAt = run.operations[0]?.at;
        if (!startedAt) continue;

        let endedAt: string, result: any;

        let hasStoppedAtLeastOnce = false;
        for (const op of run.operations) {
          if (op.event.type == "Stop") {
            endedAt = op.at;
            result = op.event.result;
            hasStoppedAtLeastOnce = true;
          }
        }

        if (hasStoppedAtLeastOnce) {
          const kind = "Ok" in result ? "Ok" : "Err";
          completed.push({
            run_id: runId,
            started_at: startedAt,
            ended_at: endedAt!,
            result: {
              status: kind == "Ok" ? "COMPLETED" : "COMPLETED_WITH_ERROR",
              value: result[kind],
            },
          });
        } else {
          ongoing.push({
            run_id: runId,
            started_at: startedAt,
          });
        }
      }

      return {
        ongoing: {
          count: ongoing.length,
          runs: ongoing.sort((a, b) =>
            a.started_at.localeCompare(b.started_at)
          ),
        },
        completed: {
          count: completed.length,
          runs: completed.sort((a, b) => a.ended_at.localeCompare(b.ended_at)),
        },
      };
    };
  }

  #stopResolver(): Resolver {
    return async ({ run_id }) => {
      const schedule = new Date().toJSON();
      await this.agent.schedule({
        backend: this.backend,
        queue: this.queue,
        run_id,
        schedule,
        operation: {
          at: new Date().toJSON(),
          event: {
            type: "Stop",
            result: {
              Err: "ABORTED",
            },
          },
        },
      });

      return run_id;
    };
  }

  #sendResolver(): Resolver {
    return async ({ run_id, event }) => {
      const schedule = new Date().toJSON();

      await this.agent.schedule({
        backend: this.backend,
        queue: this.queue,
        run_id,
        schedule,
        operation: {
          at: new Date().toJSON(),
          event: {
            type: "Send",
            event_name: event.name,
            value: event.payload,
          },
        },
      });

      return run_id;
    };
  }

  async #prepareWorkflowFiles(
    artifacts: Record<string, Artifact>,
    materializers: Materializer[],
    typegate: Typegate
  ) {
    const descriptions = await getWorkflowDescriptions(
      this.typegraphName,
      artifacts,
      materializers,
      typegate
    );

    for (const wf of descriptions) {
      this.workflowFiles.set(wf.name, wf.path);
    }
  }
}

async function getWorkflowDescriptions(
  typegraphName: string,
  artifacts: Record<string, Artifact>,
  materializers: Materializer[],
  typegate: Typegate
) {
  const basePath = path.join(typegate.config.base.tmp_dir, "artifacts");

  const workflowDescriptions = [] as Array<WorkflowDescription>;
  const seen = new Set<string>();
  for (const mat of materializers) {
    if (!["start", "stop", "send", "resources", "results"].includes(mat.name)) {
      continue;
    }

    const workflowName = mat.data.name as string;
    if (!seen.has(workflowName)) {
      const entryModulePath = await getWorkflowEntryPointPath(
        typegraphName,
        artifacts,
        mat.data,
        typegate
      );

      logger.info(`Resolved runtime artifacts at ${basePath}`);

      workflowDescriptions.push({
        name: workflowName,
        kind: (mat.data.kind as string).toUpperCase() as "DENO" | "PYTHON",
        path: entryModulePath,
      });

      seen.add(workflowName);
    }
  }

  return workflowDescriptions;
}

async function getWorkflowEntryPointPath(
  typegraphName: string,
  artifacts: Record<string, Artifact>,
  matData: Record<string, unknown>,
  typegate: Typegate
) {
  const entryPoint = artifacts[matData.file as string];
  const deps = (matData.deps as string[]).map((dep) => artifacts[dep]);
  const moduleMeta = {
    typegraphName,
    relativePath: entryPoint.path,
    hash: entryPoint.hash,
    sizeInBytes: entryPoint.size,
  };
  const depMetas = deps.map((dep) => {
    return {
      typegraphName,
      relativePath: dep.path,
      hash: dep.hash,
      sizeInBytes: dep.size,
    };
  });

  return await typegate.artifactStore.getLocalPath(moduleMeta, depMetas);
}
