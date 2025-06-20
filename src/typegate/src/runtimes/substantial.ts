// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Runtime } from "./Runtime.ts";
import type { Resolver, RuntimeInitParams } from "../types.ts";
import type { ComputeStage } from "../engine/query_engine.ts";
import {
  TypeGraph,
  type TypeGraphDS,
  type TypeMaterializer,
} from "../typegraph/mod.ts";
import { registerRuntime } from "./mod.ts";
import { getLogger, getLoggerByAddress, type Logger } from "../log.ts";
import * as ast from "graphql/ast";
import { path } from "compress/deps.ts";
import type { Artifact } from "../typegraph/types.ts";
import type { Typegate } from "../typegate/mod.ts";
import { type Backend, Meta } from "../../engine/runtime.js";
import {
  Agent,
  type AgentConfig,
  type StdKwargs,
  type WorkflowDescription,
} from "./substantial/agent.ts";
import { closestWord } from "../utils.ts";
import { InternalAuth } from "../services/auth/protocols/internal.ts";
import {
  applyFilter,
  type ExecutionStatus,
  type Expr,
} from "./substantial/filter_utils.ts";
import { createTaskId } from "./patterns/worker_manager/mod.ts";

const logger = getLogger(import.meta);

interface QueryCompletedWorkflowResult {
  run_id: string;
  started_at: string;
  ended_at: string;
  result: {
    status: ExecutionStatus;
    value: unknown; // hinted by the user
  };
}

type QueryOngoingWorkflowResult = Omit<
  QueryCompletedWorkflowResult,
  "result" | "ended_at"
>;

interface WorkflowFileDescription {
  imports: string[];
  kind: "deno" | "python";
  file: string;
  deps: string[];
}

interface SubstantialRuntimeArgs {
  backend: Backend;
  workflows: Array<WorkflowFileDescription>;
}

@registerRuntime("substantial")
export class SubstantialRuntime extends Runtime {
  private logger: Logger;
  private backend: Backend;
  private workflowFiles: Map<string, string> = new Map();

  private agent: Agent;
  private queue: string;
  private typegate: Typegate;

  private constructor(
    typegraphName: string,
    private tg: TypeGraphDS,
    backend: Backend,
    queue: string,
    agent: Agent,
    typegate: Typegate,
    private secrets: Record<string, string>,
  ) {
    super(typegraphName);
    this.logger = getLoggerByAddress(import.meta, "substantial");
    this.backend = backend;
    this.queue = queue;
    this.agent = agent;
    this.typegate = typegate;
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    logger.info("initializing SubstantialRuntime");
    const {
      typegraph: tg,
      args,
      materializers,
      secretManager,
      typegate,
    } = params;

    const runtimeArgs = args as SubstantialRuntimeArgs;

    const secrets: Record<string, string> = {};
    for (const m of materializers) {
      for (const secretName of (m.data.secrets as []) ?? []) {
        secrets[secretName] = secretManager.secretOrFail(secretName);
      }
    }

    const tgName = TypeGraph.formatName(tg);
    const backend = runtimeArgs.backend;
    if (backend.type == "redis") {
      backend.connection_string = secretManager.secretOrFail(
        backend.connection_string,
      );
    }

    const queue = "default";

    const agentConfig = {
      pollIntervalSec: typegate.config.base.substantial_poll_interval_sec!,
      leaseLifespanSec: typegate.config.base.substantial_lease_lifespan_sec!,
      maxAcquirePerTick: typegate.config.base.substantial_max_acquire_per_tick!,
    } satisfies AgentConfig;

    const hostcallCtx = {
      typegate,
      typegraphUrl: new URL(
        `internal+hostcall+subs://typegate/${params.typegraphName}`,
      ),
    };
    const agent = new Agent(hostcallCtx, backend, queue, agentConfig);

    const wfDescriptions = await getWorkflowDescriptions(
      tgName,
      tg.meta.artifacts,
      runtimeArgs.workflows,
      typegate,
    );

    agent.start(wfDescriptions);

    // Prepare the runtime
    const instance = new SubstantialRuntime(
      tgName,
      tg,
      backend,
      queue,
      agent,
      typegate,
      secrets,
    );
    await instance.#prepareWorkflowFiles(
      tg.meta.artifacts,
      runtimeArgs.workflows,
      typegate,
    );

    return instance;
  }

  async deinit() {
    logger.info("deinitializing SubstantialRuntime");
    await this.agent.stop();
  }

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
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
                `Unsupported operation type '${stage.props.operationType}'`,
              );
          }
        }),
      ];
    }

    if (this.tg.meta.namespaces!.includes(stage.props.typeIdx)) {
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

    switch (matName) {
      case "start":
        return this.#startResolver(mat, false);
      case "start_raw":
        return this.#startResolver(mat, true);
      case "stop":
        return this.#stopResolver();
      case "send":
        return this.#sendResolver(false);
      case "send_raw":
        return this.#sendResolver(true);
      case "resources":
        return ({ name: workflowName }) => {
          this.#checkWorkflowExistOrThrow(workflowName);

          const res = this.agent.workerManager.getAllocatedResources(
            workflowName,
          );
          return JSON.parse(JSON.stringify(res));
        };
      case "results":
        return this.#resultsResolver(false);
      case "results_raw":
        return this.#resultsResolver(true);
      case "advanced_filters":
        return this.#advancedFiltersResolver();
      case "internal_link_parent_child":
        return this.#linkerResolver();
      default:
        throw new Error(`Unimplemented operation ${mat.name}`);
    }
  }

  #startResolver(mat: TypeMaterializer, enableGenerics: boolean): Resolver {
    const secrets = ((mat.data.secrets as []) ?? []).reduce(
      (agg, secretName) => ({ ...agg, [secretName]: this.secrets[secretName] }),
      {},
    );
    return async ({
      name: workflowName,
      kwargs,
      _: {
        context,
        parent,
        info: { url, headers },
      },
    }) => {
      this.#checkWorkflowExistOrThrow(workflowName);

      const runId = createTaskId(workflowName);
      const schedule = new Date().toJSON();

      const token = await InternalAuth.emit(this.typegate.cryptoKeys);
      const stdKwargs = {
        kwargs: enableGenerics ? JSON.parse(kwargs) : kwargs,
        taskContext: {
          parent,
          context,
          secrets,
          effect: mat.effect.effect ?? null,
          meta: {
            url: `${url.protocol}//${url.host}/${this.typegraphName}`,
            token,
          },
          headers,
        },
      } satisfies StdKwargs;

      logger.info(
        `Start request "${workflowName}" received: new run "${runId}" should be scheduled.`,
      );
      await this.agent.schedule({
        backend: this.backend,
        queue: this.queue,
        run_id: runId,
        schedule,
        operation: {
          at: schedule,
          event: {
            type: "Start",
            kwargs: stdKwargs,
          },
        },
      });

      await this.agent.link(workflowName, runId);
      return runId;
    };
  }

  #resultsResolver(enableGenerics: boolean): Resolver {
    return async ({ name: workflowName }) => {
      this.#checkWorkflowExistOrThrow(workflowName);

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
              value: enableGenerics
                ? JSON.stringify(result[kind])
                : result[kind],
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
      const children = await Meta.substantial.metadataEnumerateAllChildren({
        backend: this.backend,
        parent_run_id: run_id,
      });

      const stopQueue = [run_id, ...children] as Array<string>;
      const willBeStopped = [];
      while (true) {
        // TODO: what if some fail? maybe collect all failing ones instead and put that on the error?
        const currRunId = stopQueue.shift();
        if (currRunId) {
          const schedule = new Date().toJSON();
          await this.agent.schedule({
            backend: this.backend,
            queue: this.queue,
            run_id: currRunId,
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

          willBeStopped.push(currRunId);
        } else {
          break;
        }
      }

      return willBeStopped;
    };
  }

  #sendResolver(enableGenerics: boolean): Resolver {
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
            value: enableGenerics ? JSON.parse(event.payload) : event.payload,
          },
        },
      });

      return run_id;
    };
  }

  #advancedFiltersResolver(): Resolver {
    return async ({ name: workflowName, filter }) => {
      this.#checkWorkflowExistOrThrow(workflowName);
      // console.log("workflow", workflowName, "Filter", filter);
      return await applyFilter(workflowName, this.agent, filter as Expr);
    };
  }

  #linkerResolver(): Resolver {
    return async ({ parent_run_id, child_run_id }) => {
      await Meta.substantial.metadataWriteParentChildLink({
        backend: this.backend,
        parent_run_id,
        child_run_id,
      });
      return true;
    };
  }

  async #prepareWorkflowFiles(
    artifacts: Record<string, Artifact>,
    fileDescriptions: Array<WorkflowFileDescription>,
    typegate: Typegate,
  ) {
    const descriptions = await getWorkflowDescriptions(
      this.typegraphName,
      artifacts,
      fileDescriptions,
      typegate,
    );

    for (const wf of descriptions) {
      this.workflowFiles.set(wf.name, wf.path);
    }
  }

  #checkWorkflowExistOrThrow(name: string) {
    if (!this.workflowFiles.has(name)) {
      const known = Array.from(this.workflowFiles.keys());
      const closest = closestWord(name, known);
      if (closest) {
        throw new Error(
          `workflow "${name}" does not exist, did you mean "${closest}"?`,
        );
      }

      throw new Error(
        `workflow "${name}" does not exist, available workflows are ${
          known
            .map((name) => `"${name}"`)
            .join(", ")
        }`,
      );
    }
  }
}

async function getWorkflowDescriptions(
  typegraphName: string,
  artifacts: Record<string, Artifact>,
  descriptions: Array<WorkflowFileDescription>,
  typegate: Typegate,
) {
  const basePath = path.join(typegate.config.base.tmp_dir, "artifacts");
  logger.info(`Resolved runtime artifacts at ${basePath}`);

  const workflowDescriptions = [] as Array<WorkflowDescription>;
  const seen = new Set<string>();

  for (const description of descriptions) {
    for (const workflowName of description.imports) {
      if (!seen.has(workflowName)) {
        const entryModulePath = await getWorkflowEntryPointPath(
          typegraphName,
          artifacts,
          description,
          typegate,
        );

        workflowDescriptions.push({
          name: workflowName,
          kind: description.kind.toUpperCase() as "DENO" | "PYTHON",
          path: entryModulePath,
        });

        seen.add(workflowName);
      }
    }
  }

  return workflowDescriptions;
}

async function getWorkflowEntryPointPath(
  typegraphName: string,
  artifacts: Record<string, Artifact>,
  description: WorkflowFileDescription,
  typegate: Typegate,
) {
  const entryPoint = artifacts[description.file as string];
  const deps = (description.deps as string[]).map((dep) => artifacts[dep]);
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
