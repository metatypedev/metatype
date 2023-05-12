// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Kind, parse } from "graphql";
import * as ast from "graphql/ast";
import {
  RuntimeResolver,
  SecretManager,
  TypeGraph,
  TypeGraphDS,
} from "./typegraph.ts";
import { JSONValue } from "./utils.ts";
import { findOperation, FragmentDefs } from "./graphql.ts";
import { TypeGraphRuntime } from "./runtimes/typegraph.ts";
import * as log from "std/log/mod.ts";
import { dirname, fromFileUrl, join } from "std/path/mod.ts";
import { sha1, unsafeExtractJWT } from "./crypto.ts";
import { ResolverError } from "./errors.ts";
import { getCookies } from "std/http/cookie.ts";
import { RateLimit } from "./rate_limiter.ts";
import {
  ComputeStageProps,
  Context,
  Info,
  Resolver,
  Variables,
} from "./types.ts";
import { parseGraphQLTypeGraph } from "./graphql/graphql.ts";
import { Planner } from "./planner/mod.ts";
import { OperationPolicies } from "./planner/policies.ts";
import { Option } from "monads";
import { getLogger } from "./log.ts";
import { handleOnInitHooks, handleOnPushHooks, PushResponse } from "./hooks.ts";
import { Validator } from "./typecheck/common.ts";
import { generateValidator } from "./typecheck/result.ts";
import { distinct } from "std/collections/distinct.ts";

const logger = getLogger(import.meta);

const localDir = dirname(fromFileUrl(import.meta.url));
const introspectionDefStatic = await Deno.readTextFile(
  join(localDir, "typegraphs/introspection.json"),
);

const VARIANT_TRANSITION_REGEX = /\$([^\.\$]+)$/;

/**
 * Processed graphql node to be evaluated against a Runtime
 * ```
 * node_1(node_2: ...) {
 *   node_3
 *   ..
 * }
 * ..
 * ```
 */
export class ComputeStage {
  props: ComputeStageProps;
  varTypes: Record<string, string> = {};

  constructor(props: ComputeStageProps) {
    this.props = props;
  }

  id(): string {
    return this.props.path.join(".");
  }

  varType(varName: string): string {
    const typ = this.varTypes[varName];
    if (typ == null) {
      throw new Error(`variable not found: $${varName}`);
    }
    return typ;
  }

  toString(): string {
    return `dep ${
      this.props.dependencies
        .map((d) =>
          this.props.parent && d === this.props.parent.id() ? `${d} (P)` : d
        )
        .join(", ")
    }\nid  ${this.id()}\ntype ${this.props.outType.type}\narg ${
      JSON.stringify(this.props.args)
    }\n--`;
  }

  withResolver(resolver: Resolver): ComputeStage {
    return new ComputeStage({
      ...this.props,
      resolver,
    });
  }
}

// typechecks for scalar types
const typeChecks: Record<string, (value: unknown) => boolean> = {
  Int: (value) => typeof value === "number",
  Float: (value) => typeof value === "number",
  String: (value) => typeof value === "string",
  ID: (value) => typeof value === "string",
  Boolean: (value) => typeof value === "boolean",
};

function isIntrospectionQuery(
  operation: ast.OperationDefinitionNode,
  _fragments: FragmentDefs,
) {
  return operation.name?.value === "IntrospectionQuery";
}

interface Plan {
  stages: ComputeStage[];
  policies: OperationPolicies;
  validator: Validator;
}

function withEmptyObjects(res: unknown): unknown {
  if (Array.isArray(res)) {
    return res.map(withEmptyObjects);
  }
  return typeof res === "object" && res != null ? {} : res;
}

class QueryCache {
  private map: Map<string, Plan> = new Map();

  static async getKey(
    operation: ast.OperationDefinitionNode,
    fragments: FragmentDefs,
  ) {
    return await sha1(JSON.stringify(operation) + JSON.stringify(fragments));
  }

  get(key: string) {
    return this.map.get(key);
  }

  put(key: string, plan: Plan) {
    this.map.set(key, plan);
  }
}

interface BranchSelection {
  level: number;
  select: string | null;
}

export class Engine {
  name: string;
  queryCache: QueryCache;
  logger: log.Logger;

  private constructor(
    public tg: TypeGraph,
  ) {
    this.tg = tg;
    this.name = tg.name;
    this.queryCache = new QueryCache();
    this.logger = log.getLogger("engine");
  }

  static async init(
    payload: string,
    secrets: Record<string, string>,
    sync: boolean, // redis synchronization?
    response: PushResponse,
    customRuntime: RuntimeResolver = {},
    introspectionDefPayload: string | null = introspectionDefStatic,
  ) {
    const typegraph = JSON.parse(payload);
    const typegraphName = typegraph.types[0].title;
    response.typegraphName(typegraphName);

    const secretManager = new SecretManager(typegraphName, secrets);

    const typegraphDS = sync ? typegraph : await handleOnPushHooks(
      typegraph,
      secretManager,
      response,
    );

    let introspection = null;

    if (introspectionDefPayload) {
      const introspectionDefRaw = JSON.parse(
        introspectionDefPayload,
      ) as TypeGraphDS;
      const introspectionDef = parseGraphQLTypeGraph(introspectionDefRaw);
      introspection = await TypeGraph.init(
        introspectionDef,
        new SecretManager(introspectionDef.types[0].title, {}),
        {
          typegraph: TypeGraphRuntime.init(
            typegraphDS,
            [],
            {},
          ),
        },
        null,
      );
    }

    const tg = await TypeGraph.init(
      typegraphDS,
      secretManager,
      customRuntime,
      introspection,
    );

    handleOnInitHooks(tg, secretManager, sync);

    return new Engine(tg);
  }

  async terminate() {
    return await this.tg.deinit();
  }

  /**
   * Note:
   * Each `ComputeStage` relates to a specific type/node generated from the graphql
   * 1. `plan: ComputeStage` should be of the same cardinality as the types enumerated in the graphql
   * 2. values are computed depending on the Runtime
   *
   * See `planner/mod.ts` on how the graphql is processed to build the plan
   */
  async compute(
    plan: ComputeStage[],
    policies: OperationPolicies,
    context: Context,
    info: Info,
    variables: Record<string, unknown>,
    limit: RateLimit | null,
    verbose: boolean,
  ): Promise<JSONValue> {
    const ret = {};
    const cache: Record<string, unknown[]> = {};
    const lenses: Record<string, unknown[]> = {};

    await policies.authorize(context, info, verbose);

    const selections: BranchSelection[] = [];
    const getActiveSelection = () => selections[selections.length - 1] ?? null;

    for await (const stage of plan) {
      const {
        dependencies,
        args,
        effect,
        resolver,
        path,
        parent,
        batcher,
        node,
        rateCalls,
        rateWeight,
        childSelection,
      } = stage.props;

      const level = path.length;
      const stageId = stage.id();
      // const parentId = parent.id();
      const parentId = parent && stageId.slice(0, stageId.lastIndexOf("."));

      let activeSelection = getActiveSelection();
      while (activeSelection != null && level < activeSelection.level) {
        selections.pop();
        activeSelection = getActiveSelection();
      }

      if (activeSelection != null) {
        if (parentId == null) {
          throw new Error("unexpected state");
        }

        if (activeSelection.level === level) {
          // potential variant transition
          const match = parentId?.match(VARIANT_TRANSITION_REGEX);
          if (match == null) {
            throw new Error(
              "Expected parentId to match variant transition RegExp",
            );
          }
          activeSelection.select = match[1];
        }

        if (cache[parentId] == null || cache[parentId].length === 0) {
          // non matching variant -> skip stage
          continue;
        }
      }

      // TODO
      const deps = dependencies
        .filter((dep) => dep !== parent?.id())
        .filter((dep) => !(parent && dep.startsWith(`${parent.id()}.`)))
        .reduce((agg, dep) => ({ ...agg, [dep]: cache[dep] }), {});

      //verbose && console.log("dep", stage.id(), deps);
      const previousValues = parentId ? cache[parentId] : ([{}] as any);
      const lens = parentId ? lenses[parentId] : ([ret] as any);

      if (limit && rateCalls) {
        limit.consume(rateWeight ?? 1);
      }

      const computeArgs = args ?? (() => ({}));

      const res = await Promise.all(
        previousValues.map((parent: any) =>
          resolver!({
            ...computeArgs({ variables, context, parent, effect }),
            _: {
              parent: parent ?? {},
              context,
              info,
              variables,
              effect,
              ...deps,
            },
          })
        ),
      );

      if (limit && !rateCalls) {
        limit.consume(res.length * (rateWeight ?? 1));
      }

      // or no cache if no further usage
      cache[stageId] = batcher(res);

      if (
        lens.length !== res.length
      ) {
        throw new Error(
          `cannot align array results ${lens.length} != ${res.length} at stage ${stage.id()}: ${
            JSON.stringify(lens)
          }, ${JSON.stringify(res)}`,
        );
      }

      const field = path[path.length - 1];
      if (node !== "") {
        lens.forEach((l: any, i: number) => {
          // Objects are replaced by empty objects `{}`.
          // It will be populated by child compute stages using values in `cache`.
          l[field] = withEmptyObjects(res[i]);
        });

        lenses[stageId] = lens.flatMap((l: any) => {
          return batcher([l[field]]) ?? [];
        });
      }

      if (childSelection != null) {
        if (activeSelection != null && activeSelection.level === level) {
          // nested union/either: variants should have been combined
          throw new Error();
        }
        const resultVariants = cache[stageId].map((r) => {
          const variant = childSelection(r);
          if (variant == null) {
            throw new Error(
              `at '${stageId}': No matcing union variant for the result`,
            );
          }
          return variant;
        });
        for (const variant of distinct(resultVariants)) {
          cache[`${stageId}$${variant}`] = [];
          lenses[`${stageId}$${variant}`] = [];
        }
        for (const [i, variant] of resultVariants.entries()) {
          cache[`${stageId}$${variant}`].push(cache[stageId][i]);
          lenses[`${stageId}$${variant}`].push(lenses[stageId][i]);
        }
        selections.push({
          level: level + 1,
          select: null,
        });
      }
    }

    return ret;
  }

  materialize(
    stages: ComputeStage[],
    verbose: boolean,
  ): ComputeStage[] {
    //verbose && console.log(stages);

    const stagesMat: ComputeStage[] = [];
    const waitlist = [...stages];

    while (waitlist.length > 0) {
      const stage = waitlist.shift()!;
      stagesMat.push(
        ...stage.props.runtime.materialize(stage, waitlist, verbose),
      );
    }

    return stagesMat;
  }

  optimize(stages: ComputeStage[], _verbose: boolean): ComputeStage[] {
    //verbose && console.log(stages);

    for (const _stage of stages) {
      //verbose && console.log("opti", stage.id());
    }

    return stages;
  }

  async getPlan(
    operation: ast.OperationDefinitionNode,
    fragments: FragmentDefs,
    cache: boolean,
    verbose: boolean,
  ): Promise<[Plan, boolean]> {
    const cacheKey = await QueryCache.getKey(operation, fragments);

    if (cache) {
      const cached = this.queryCache.get(cacheKey);
      if (cached != null) return [cached, true];
    }

    // what
    const planner = new Planner(operation, fragments, this.tg, verbose);
    const { stages, policies } = planner.getPlan();
    /*
    this.logger.info(
      "stages:",
      ["", ...stages.map((s) => s.toString())].join("\n")
    );
    */

    // how
    const stagesMat = this.materialize(stages, verbose);

    // when
    const optimizedStages = this.optimize(stagesMat, verbose);

    const validator = generateValidator(
      isIntrospectionQuery(operation, fragments)
        ? this.tg.introspection!
        : this.tg,
      operation,
      fragments,
    );

    const plan: Plan = {
      stages: optimizedStages,
      policies,
      validator,
    };

    if (cache) {
      this.queryCache.put(cacheKey, plan);
    }

    return [plan, false];
  }

  async execute(
    query: string,
    operationName: Option<string>,
    variables: Variables,
    context: Context,
    info: Info,
    limit: RateLimit | null,
  ): Promise<{ status: number; [key: string]: JSONValue }> {
    try {
      const document = parse(query);

      const [operation, fragments] = findOperation(document, operationName);
      if (operation.isNone()) {
        throw Error(`operation ${operationName.unwrapOr("<none>")} not found`);
      }
      const unwrappedOperation = operation.unwrap();

      this.validateVariables(
        unwrappedOperation.variableDefinitions ?? [],
        variables,
      );

      const isIntrospection = isIntrospectionQuery(
        unwrappedOperation,
        fragments,
      );
      const verbose = !isIntrospection;

      if (verbose) {
        this.logger.info("———");
        this.logger.info("op:", operationName);
      }

      const startTime = performance.now();
      const [plan, cacheHit] = await this.getPlan(
        unwrappedOperation,
        fragments,
        true,
        verbose,
      );
      const planTime = performance.now();

      const { stages, policies, validator } = plan;

      //logger.info("dag:", stages);
      const res = await this.compute(
        stages,
        policies,
        context,
        info,
        variables,
        limit,
        verbose,
      );
      const computeTime = performance.now();

      //console.log("value computed", res);
      validator(res);
      const endTime = performance.now();

      if (verbose) {
        this.logger.info(
          `${cacheHit ? "fetched" : "planned"}  in ${
            (
              planTime - startTime
            ).toFixed(2)
          }ms`,
        );
        this.logger.info(
          `computed in ${(computeTime - planTime).toFixed(2)}ms`,
        );
        this.logger.info(
          `validated in ${(endTime - computeTime).toFixed(2)}ms`,
        );
      }

      return { status: 200, data: res };
    } catch (e) {
      // deno-lint-ignore no-prototype-builtins
      if (e.hasOwnProperty("isErr")) {
        // field error
        console.error("field err:", e.unwrapErr());
        return {
          status: 200, // or 502 is nested gateway
          errors: [
            {
              message: e.unwrapErr(),
              locations: [],
              path: [],
              extensions: { timestamp: new Date().toISOString() },
            },
          ],
        };
      } else if (e instanceof ResolverError) {
        // field error
        console.error("field err:", e);
        return {
          status: 200, // or 502 is nested gateway
          errors: [
            {
              message: e.message,
              locations: [],
              path: [],
              extensions: { timestamp: new Date().toISOString() },
            },
          ],
        };
      } else {
        // request error
        console.error("request err:", e);
        return {
          status: 400,
          errors: [
            {
              message: e.message,
              locations: [],
              path: [],
              extensions: { timestamp: new Date().toISOString() },
            },
          ],
        };
      }
    }
  }

  validateVariables(
    defs: Readonly<Array<ast.VariableDefinitionNode>>,
    variables: Record<string, unknown>,
  ) {
    for (const varDef of defs) {
      const varName = varDef.variable.name.value;
      const value = variables[varName];
      if (value === undefined) {
        throw Error(`missing variable "${varName}" value`);
      }
      this.validateVariable(varDef.type, value, varName);
    }
  }

  validateVariable(type: ast.TypeNode, value: unknown, label: string) {
    if (type.kind === Kind.NON_NULL_TYPE) {
      if (value == null) {
        throw new Error(`variable ${label} cannot be null`);
      }
      type = type.type;
    }
    if (value == null) {
      return;
    }
    switch (type.kind) {
      case Kind.LIST_TYPE:
        if (!Array.isArray(value)) {
          throw new Error(`variable ${label} must be an array`);
        }
        value.forEach((item, idx) => {
          this.validateVariable(
            (type as ast.ListTypeNode).type,
            item,
            `${label}[${idx}]`,
          );
        });
        break;
      case Kind.NAMED_TYPE:
        this.validateValueType(type.name.value, value, label);
    }
  }

  validateValueType(typeName: string, value: unknown, label: string) {
    const check = typeChecks[typeName];
    if (check != null) {
      // scalar type
      if (!check(value)) {
        console.error(
          `expected type ${typeName}, got value ${JSON.stringify(value)}`,
        );
        throw new Error(`variable ${label} must be a ${typeName}`);
      }
      return;
    }
    this.tg.validateValueType(typeName, value, label);
  }

  async ensureJWT(
    headers: Headers,
    url: URL,
  ): Promise<[Record<string, unknown>, Headers]> {
    let [kind, token] = (headers.get("Authorization") ?? "").split(" ");
    if (!token) {
      const name = this.tg.root.title;
      token = getCookies(headers)[name];
    }

    if (!token) {
      return [{}, new Headers()];
    }

    let auth = null;

    if (kind.toLowerCase() === "basic") {
      auth = this.tg.auths.get("basic");
    } else {
      try {
        const { provider } = await unsafeExtractJWT(token);
        if (!provider) {
          // defaulting to first auth
          auth = this.tg.auths.values().next().value;
        } else {
          auth = this.tg.auths.get(provider as string);
        }
      } catch {
        logger.warning("no malformed jwt");
      }
    }

    if (!auth) {
      return [{}, new Headers()];
    }

    return await auth.tokenMiddleware(token, url);
  }
}
