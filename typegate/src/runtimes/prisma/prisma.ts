// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "../Runtime.ts";
import * as native from "native";
import { ResolverError } from "../../errors.ts";
import { Resolver, RuntimeInitParams } from "../../types.ts";
import { iterParentStages, nativeResult, nativeVoid } from "../../utils.ts";
import { ComputeStage } from "../../engine/query_engine.ts";
import { ComputeArgParams } from "../../engine/planner/args.ts";
import { PrismaOperationMatData } from "../../typegraph/types.ts";
import { getLogger } from "../../log.ts";
import * as PrismaRT from "./types.ts";
import { filterValues } from "std/collections/filter_values.ts";

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

type PrismaResult = {
  data: Record<string, any>;
} | {
  errors: PrismaError[];
};

type PrismaRuntimeData = PrismaRT.DataFinal;

type SelectionSet = Record<string, SelectionSetValue>;

type SelectionSetValue = boolean | FieldQuery;
interface FieldQuery {
  selection: SelectionSet;
  arguments?: Record<string, unknown>;
}

interface SingleQuery {
  modelName?: string;
  action: string;
  query: FieldQuery;
}

interface BatchQuery {
  batch: SingleQuery[];
  // transaction
}

interface GenQuery {
  (params: ComputeArgParams): SingleQuery | BatchQuery;
}

export class PrismaRuntime extends Runtime {
  private constructor(
    typegraphName: string,
    readonly name: string,
    private datamodel: string,
  ) {
    super(typegraphName);
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
    nativeVoid(
      await native.prisma_register_engine({
        engine_name: instance.id,
        datamodel,
      }),
    );
    return instance;
  }

  async deinit(): Promise<void> {
    nativeVoid(
      await native.prisma_unregister_engine({
        engine_name: this.id,
      }),
    );
  }

  async query(query: SingleQuery | BatchQuery) {
    const isBatchQuery = "batch" in query;
    const { res } = nativeResult(
      await native.prisma_query({
        engine_name: this.id,
        query: query,
        datamodel: this.datamodel,
      }),
    );
    const result = JSON.parse(res);

    // TODO refactor when we support partial results in GraphQL
    const results = isBatchQuery ? result.batchResult : [result];
    const ret = [];
    for (const r of results) {
      if ("errors" in r) {
        console.error("remote prisma errors", r.errors);
        throw new ResolverError(r.errors[0].user_facing_error.message);
      }
      ret.push(r.data);
    }
    return isBatchQuery ? ret : ret[0];
  }

  execute(
    q: GenQuery,
    path: string[],
    renames: Record<string, string>,
  ): Resolver {
    return async ({ _: { variables, context, effect, parent }, ..._args }) => {
      path[0] = renames[path[0]] ?? path[0];

      const startTime = performance.now();
      const generatedQuery = q({ variables, context, effect, parent });
      console.log(
        "remote prisma query",
        JSON.stringify(generatedQuery, null, 2),
      );
      const res = await this.query(generatedQuery);
      const endTime = performance.now();
      logger.debug(`queried prisma in ${(endTime - startTime).toFixed(2)}ms`);

      return path.reduce((r, field) => r[field], res);
    };
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

  buildQuery(stages: ComputeStage[]): [GenQuery, Record<string, string>] {
    const queries: ((p: ComputeArgParams) => SingleQuery)[] = [];
    const renames: Record<string, string> = {};
    iterParentStages(stages, (stage, children) => {
      const mat = stage.props.materializer;
      if (mat == null) {
        throw new Error("");
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
      return [queries[0], renames];
    } else {
      return [(p) => ({
        batch: queries.map((q) => q(p)),
      }), renames];
    }
  }

  materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    const path = stage.props.path;
    const node = path[path.length - 1];
    if (node == null) {
      throw new Error("GraphQL cannot be used at the root of the typegraph");
    }

    const fields = [stage, ...Runtime.collectRelativeStages(stage, waitlist)];

    const [query, renames] = this.buildQuery(fields);

    const queryStage = stage.withResolver(
      this.execute(
        query,
        stage.props.materializer?.data.path as string[] ??
          [node],
        renames,
      ),
    );
    const stagesMat: ComputeStage[] = [];
    stagesMat.push(queryStage);

    fields.shift();
    // TODO renames

    for (const field of fields) {
      if (field.props.parent?.id() === stage.props.parent?.id()) {
        const resolver: Resolver = ({
          _: ctx,
        }) => {
          const { [queryStage.id()]: queryRes } = ctx;
          const fieldName = field.props.path[field.props.path.length - 1];
          const resolver = (queryRes as any)[0][fieldName];
          const ret = typeof resolver === "function" ? resolver() : resolver;
          return ret;
        };
        stagesMat.push(
          new ComputeStage({
            ...field.props,
            dependencies: [...field.props.dependencies, queryStage.id()],
            resolver,
          }),
        );
      } else {
        const resolver: Resolver = ({ _: { parent } }) => {
          const resolver = parent[field.props.node];
          const rawValue = typeof resolver === "function"
            ? resolver()
            : resolver;
          const matData = stage.props.materializer
            ?.data as unknown as PrismaOperationMatData;

          // if queryRaw is used, the result has a type tag
          const ret = matData.operation === "queryRaw"
            ? rawValue["prisma__value"]
            : rawValue;

          // Prisma uses $type tag for formatted strings
          // eg. `createAt: { "$type": "DateTime", value: "2023-12-05T14:10:21.840Z" }`
          if (
            !Array.isArray(ret) &&
            typeof ret === "object" &&
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
            dependencies: [...field.props.dependencies, queryStage.id()],
            resolver,
          }),
        );
      }
    }

    return stagesMat;
  }
}
