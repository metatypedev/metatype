// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Kind, parse } from "graphql";
import * as ast from "graphql/ast";
import {
  RuntimeResolver,
  TypeGraph,
  TypeGraphDS,
  typegraphVersion,
} from "./typegraph.ts";
import { ensure, JSONValue } from "./utils.ts";
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
import { TypeCheck } from "./typecheck.ts";
import { parseGraphQLTypeGraph } from "./graphql/graphql.ts";
import { Planner } from "./planner/mod.ts";
import config from "./config.ts";
import * as semver from "std/semver/mod.ts";
import { OperationPolicies } from "./planner/policies.ts";
import { Option } from "monads";
import { getLogger } from "./log.ts";

const logger = getLogger(import.meta);

const localDir = dirname(fromFileUrl(import.meta.url));
const introspectionDefStatic = await Deno.readTextFile(
  join(localDir, "typegraphs/introspection.json"),
);

const typegraphChangelog: Record<
  string,
  { next: string; transform: (x: TypeGraphDS) => TypeGraphDS }
> = {
  "0.0.0": {
    "next": "0.0.1",
    "transform": (x) => x,
  },
};

function upgradeTypegraph(typegraph: TypeGraphDS) {
  const typegraphName = typegraph.types[0].title;
  const { meta } = typegraph;

  let currentVersion = meta.version;
  while (semver.neq(typegraphVersion, currentVersion)) {
    const migration = typegraphChangelog[currentVersion];
    if (!migration) {
      throw Error(
        `typegate ${config.version} supports typegraph ${typegraphVersion} which is incompatible with ${typegraphName} ${meta.version} (max auto upgrade was ${currentVersion})`,
      );
    }
    typegraph = migration.transform(typegraph);
    currentVersion = migration.next;
  }

  return typegraph;
}

export const initTypegraph = async (
  payload: string,
  customRuntime: RuntimeResolver = {},
  introspectionDefPayload: string | null = introspectionDefStatic,
) => {
  const typegraphDSRaw = upgradeTypegraph(JSON.parse(payload));
  const typegraphDS = structuredClone(typegraphDSRaw);
  parseGraphQLTypeGraph(typegraphDS);

  let introspection = null;

  if (introspectionDefPayload) {
    const introspectionDefRaw = JSON.parse(
      introspectionDefPayload,
    ) as TypeGraphDS;
    const introspectionDef = structuredClone(introspectionDefRaw);
    parseGraphQLTypeGraph(introspectionDef);
    introspection = await TypeGraph.init(
      introspectionDefRaw,
      introspectionDef,
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
    typegraphDSRaw,
    typegraphDS,
    customRuntime,
    introspection,
  );
  return new Engine(tg);
};

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
  validator: TypeCheck;
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

export class Engine {
  tg: TypeGraph;
  name: string;
  queryCache: QueryCache;
  logger: log.Logger;

  constructor(tg: TypeGraph) {
    this.tg = tg;
    this.name = tg.name;
    this.queryCache = new QueryCache();
    this.logger = log.getLogger("engine");
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
    const cache: Record<string, unknown> = {};
    const lenses: Record<string, unknown> = {};

    await policies.authorize(context, info, verbose);

    for await (const stage of plan) {
      const {
        dependencies,
        args,
        resolver,
        path,
        parent,
        batcher,
        node,
        rateCalls,
        rateWeight,
      } = stage.props;

      const deps = dependencies
        .filter((dep) => dep !== parent?.id())
        .filter((dep) => !(parent && dep.startsWith(`${parent.id()}.`)))
        .reduce((agg, dep) => ({ ...agg, [dep]: cache[dep] }), {});

      //verbose && console.log("dep", stage.id(), deps);
      const previousValues = parent ? cache[parent.id()] : ([{}] as any);
      const lens = parent ? lenses[parent.id()] : ([ret] as any);

      if (limit && rateCalls) {
        limit.consume(rateWeight ?? 1);
      }

      const computeArgs = args ?? (() => ({}));

      const res = await Promise.all(
        previousValues.map((parent: any) =>
          resolver!({
            ...computeArgs(variables, parent, context),
            _: {
              parent: parent ?? {},
              context,
              info,
              variables,
              effect: null, // TODO
              ...deps,
            },
          })
        ),
      );

      if (limit && !rateCalls) {
        limit.consume(res.length * (rateWeight ?? 1));
      }

      // or no cache if no further usage
      cache[stage.id()] = batcher(res);

      ensure(
        lens.length === res.length,
        `cannot align array results ${lens.length} != ${res.length}`,
      );
      const field = path[path.length - 1] as any;
      if (node !== "") {
        lens.forEach((l: any, i: number) => {
          l[field] = res[i];
        });

        lenses[stage.id()] = batcher(lens).flatMap((l: any) => {
          return l[field] ?? [];
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

    const validator = TypeCheck.init(
      isIntrospectionQuery(operation, fragments)
        ? this.tg.introspection!.tg.types
        : this.tg.tg.types,
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
      validator.validate(res);
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
          logger.warning("no provider in jwt");
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
