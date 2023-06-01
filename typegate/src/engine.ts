// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { parse } from "graphql";
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
import { ComputationEngine } from "./engine/computation_engine.ts";

const logger = getLogger(import.meta);

const localDir = dirname(fromFileUrl(import.meta.url));
const introspectionDefStatic = await Deno.readTextFile(
  join(localDir, "typegraphs/introspection.json"),
);

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

function isIntrospectionQuery(
  operation: ast.OperationDefinitionNode,
  _fragments: FragmentDefs,
) {
  return operation.name?.value === "IntrospectionQuery";
}

// See `planner/mod.ts` on how the graphql is processed to build the plan
interface Plan {
  // matching to each selection in the graphql query
  stages: ComputeStage[];
  policies: OperationPolicies;
  validator: Validator;
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
      const res = await ComputationEngine.compute(
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
      // variable values are validated with the argument validator
    }
  }

  async ensureJWT(
    headers: Headers,
    url: URL,
  ): Promise<[Record<string, unknown>, Headers]> {
    const [kind, token] = (headers.get("Authorization") ?? "").split(" ");
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
