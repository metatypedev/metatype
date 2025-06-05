// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Runtime } from "../Runtime.ts";
import * as native from "native";
import { ResolverError } from "../../errors.ts";
import type { Resolver, RuntimeInitParams } from "../../types.ts";
import { iterParentStages, nativeResult, nativeVoid } from "../../utils.ts";
import { ComputeStage } from "../../engine/query_engine.ts";
import type { ComputeArgParams } from "../../engine/planner/args.ts";
import type { PrismaOperationMatData } from "../../typegraph/types.ts";
import { getLogger, type Logger } from "../../log.ts";
import type * as PrismaRT from "./types.ts";
import { filterValues } from "@std/collections/filter-values";

const logger = getLogger(import.meta);

export const makeDatasource = (uri: string) => {
  const scheme = new URL(uri).protocol.slice(0, -1);
  return `
  datasource db {
    provider = "${scheme}"
    url      = "${uri}"
  }
  `;
};

interface PrismaError {
  error: string;
  user_facing_error: {
    is_panic: false;
    message: string;
    meta: Record<string, unknown>;
    error_code: string;
  };
}

type PrismaResult =
  | {
    data: Record<string, any>;
  }
  | {
    errors: PrismaError[];
  };

type BatchPrismaResult = { batchResult: PrismaResult[] };

type PrismaRuntimeData = PrismaRT.DataFinal;

type SelectionSet = Record<string, SelectionSetValue>;

type SelectionSetValue = boolean | FieldQuery;
interface FieldQuery {
  selection: SelectionSet;
  arguments?: Record<string, unknown>;
}

export interface SingleQuery {
  modelName?: string;
  action: string;
  query: FieldQuery;
}

export interface BatchQuery {
  batch: SingleQuery[];
  // transaction
}

interface GenQuery {
  (params: ComputeArgParams): SingleQuery | BatchQuery;
}

export class PrismaRuntime extends Runtime {
  private logger: Logger;

  private constructor(
    typegraphName: string,
    readonly name: string,
    private datamodel: string,
  ) {
    super(typegraphName);
    this.logger = getLogger(`prisma:${typegraphName}:${name}`);
  }

  static async init(
    params: RuntimeInitParams,
  ): Promise<Runtime> {
    const { typegraphName, args, secretManager } =
      params as unknown as RuntimeInitParams<PrismaRuntimeData>;

    const datasource = makeDatasource(secretManager.secretOrFail(
      args.connection_string_secret as string,
    ));
    const datamodel = `${datasource}${args.datamodel}`;
    const instance = new PrismaRuntime(
      typegraphName,
      args.name,
      datamodel,
    );
    logger.info(`registering prisma engine '${instance.name}': ${instance.id}`);
    nativeVoid(
      await native.prisma_register_engine({
        engine_name: instance.id,
        datamodel,
      }),
    );
    logger.info(`prisma engine '${instance.name}' registered`);
    return instance;
  }

  async deinit(): Promise<void> {
    this.logger.info(`unregistering prisma engine '${this.name}': ${this.id}`);
    nativeVoid(
      await native.prisma_unregister_engine({
        engine_name: this.id,
      }),
    );
    this.logger.info(`prisma engine '${this.name}' unregistered`);
  }

  async query(query: SingleQuery | BatchQuery) {
    const isBatchQuery = "batch" in query;
    this.logger.info(
      `prisma query on runtime '${this.name}': ${JSON.stringify(query)}`,
    );
    const { res } = nativeResult(
      await native.prisma_query({
        engine_name: this.id,
        query: query,
        datamodel: this.datamodel,
      }),
    );
    const result = JSON.parse(res) as PrismaResult | BatchPrismaResult;

    if ("errors" in result) {
      this.logger.error("remote prisma errors", result.errors);
      throw new ResolverError(result.errors[0].user_facing_error.message);
    } else {
      this.logger.info(`prisma query successful on runtime '${this.name}'`);
      this.logger.debug(`prisma query result: ${JSON.stringify(result)}`);
    }

    // TODO refactor when we support partial results in GraphQL
    const results = isBatchQuery
      ? (result as BatchPrismaResult).batchResult
      : [result as PrismaResult];
    const ret = [];
    for (const r of results) {
      if ("errors" in r) {
        // TODO support for partial failures??
        this.logger.error(
          `(rt:'${this.name}') remote prisma errors: ${r.errors}`,
        );
        throw new ResolverError(r.errors[0].user_facing_error.message);
      }
      ret.push(r.data);
    }
    return ret;
  }

  static buildSelectionSet(stages: ComputeStage[]): SelectionSet {
    const selectionSet: SelectionSet = {};
    iterParentStages(stages, (stage, children) => {
      if (children.length === 0) {
        selectionSet[stage.props.node] = true;
      } else {
        selectionSet[stage.props.node] = {
          selection: PrismaRuntime.buildSelectionSet(
            children,
          ),
        };
      }
    });

    return selectionSet;
  }

  buildQuery(
    stages: ComputeStage[],
  ): [GenQuery, Record<string, string>, string[]] {
    const queries: ((p: ComputeArgParams) => SingleQuery)[] = [];
    const order = [] as string[];
    const renames: Record<string, string> = {};
    iterParentStages(stages, (stage, children) => {
      order.push(stage.id());
      const mat = stage.props.materializer;
      if (mat == null) {
        this.logger.error(
          "Materializer not found during Query Planning for Operation:",
          stage.props.operationName,
        );
        throw new Error("Materializer not found during Query Planning.", {
          cause: `${stage.props.operationName} - ${stage.props.operationType}`,
        });
      }
      const matData = mat.data as unknown as PrismaOperationMatData;

      if (
        matData.operation === "queryRaw" || matData.operation === "executeRaw"
      ) {
        renames[stage.props.node] = matData.operation;
        queries.push((p) => {
          const args = filterValues(
            stage.props.args?.(p) ?? {},
            (v) => v != null,
          );
          const orderedKeys = (matData.ordered_keys ?? []) as Array<string>;
          const parameters = orderedKeys.map((
            key,
          ) => args[key] ?? null);
          return {
            action: matData.operation,
            query: {
              arguments: {
                query: matData.table,
                parameters: JSON.stringify(parameters),
              },
              selection: {},
            },
          };
        });
      } else {
        renames[stage.props.node] = matData.operation + matData.table;
        queries.push((p) => ({
          modelName: matData.table,
          action: matData.operation,
          query: {
            selection: PrismaRuntime.buildSelectionSet(children),
            arguments: filterValues(
              stage.props.args?.(p) ?? {},
              (v) => v != null,
            ),
          },
        }));
      }
    });

    if (queries.length === 1) {
      return [queries[0], renames, order];
    } else {
      return [
        (p) => ({
          batch: queries.map((q) => q(p)),
        }),
        renames,
        order,
      ];
    }
  }

  materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    {
      const path = stage.props.path;
      const node = path[path.length - 1];
      if (node == null) {
        throw new Error("GraphQL cannot be used at the root of the typegraph");
      }
    }

    const batchedStages = [
      stage,
      ...Runtime.collectRelativeStages(stage, waitlist),
    ];
    const queries = batchedStages.filter(
      (field) => !field.props.dependencies.length,
    );
    const fields = batchedStages.filter(
      (field) => field.props.dependencies.length,
    );

    const [queryFn, renames, stageOrder] = this.buildQuery(batchedStages);

    if (new Set(stageOrder).size != stageOrder.length) {
      throw new Error("duplicate top stage ids");
    }

    const batchStage = new ComputeStage({
      ...stage.props,
      materializer: {
        data: { operation: "batch" },
        effect: stage.props.materializer!.effect,
        name: "batch",
        runtime: stage.props.materializer!.runtime,
      },
      operationName: "prisma_batch",
      dependencies: [],
      args: (x: any) => x,
      node: "",
      path: [crypto.randomUUID()],
      batcher: (x) => x,
      rateCalls: false,
      rateWeight: 0,
      effect: null,
      // ...stage.props,
      resolver: async ({ _: { variables, context, effect, parent } }) => {
        const startTime = performance.now();
        const generatedQuery = queryFn({ variables, context, effect, parent });
        const res = await this.query(generatedQuery);
        const endTime = performance.now();
        this.logger.debug(
          `queried prisma in ${(endTime - startTime).toFixed(2)}ms`,
        );
        return res;
      },
    });
    const stagesMat = [batchStage];

    const parentToResolver = new Map<string, string>();
    for (const preStage of queries) {
      const stage = preStage.withResolver((args) => {
        const path = stage.props.materializer?.data.path as string[] ??
          [stage.props.node];

        const { [batchStage.id()]: queryRes } = args._;
        const res = queryRes as Record<string, any>[][];
        const renamedPath = [...path];
        renamedPath[0] = renames[path[0]] ?? path[0];
        const myRes = res[0][stageOrder.indexOf(stage.id())];

        if (renamedPath[0] == "queryRaw") {
          return myRes.queryRaw.rows.map(
            (row: any[]) =>
              Object.fromEntries(
                row.map(
                  (val, idx) => [myRes.queryRaw.columns[idx], val],
                ),
              ),
          );
        }
        return renamedPath.reduce((r, field) => r[field], myRes);
      }, [
        ...preStage.props.dependencies,
        batchStage.id(),
      ]);
      parentToResolver.set(stage.id(), stage.id());
      stagesMat.push(stage);
    }

    // TODO renames
    for (const field of fields) {
      const resolver: Resolver = ({ _: { parent } }) => {
        const resolver = parent[field.props.node];
        const ret = typeof resolver === "function" ? resolver() : resolver;

        // Prisma uses $type tag for formatted strings
        // eg. `createAt: { "$type": "DateTime", value: "2023-12-05T14:10:21.840Z" }`
        if (
          typeof ret === "object" &&
          !Array.isArray(ret) &&
          ret !== null &&
          "$type" in ret // !
        ) {
          return ret?.["value"] ?? ret;
        }
        return ret;
      };
      stagesMat.push(
        new ComputeStage({
          ...field.props,
          dependencies: [
            ...field.props.dependencies,
            ...(field.props.parent?.id() ?? "")
              .split(".")
              .filter((str) => str.length)
              .map(str => parentToResolver.get(str)!)
              .filter(Boolean),
          ],
          resolver,
        }),
      );
    }

    return stagesMat;
  }
}
