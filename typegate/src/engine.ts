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
import { sha1 } from "./crypto.ts";
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
import { None } from "monads";
import { handleOnInitHooks, handleOnPushHooks, PushResponse } from "./hooks.ts";
import { Validator } from "./typecheck/common.ts";
import { generateValidator } from "./typecheck/result.ts";
import { ComputationEngine } from "./engine/computation_engine.ts";
import { isIntrospectionQuery } from "./services/graphql_service.ts";

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

const effectToMethod = {
  "none": "GET",
  "create": "POST",
  "update": "PUT",
  "delete": "DELETE",
};

export class Engine {
  name: string;
  queryCache: QueryCache;
  logger: log.Logger;
  rest: Record<
    string,
    Record<
      string,
      [Plan, (v: Record<string, unknown>) => Record<string, unknown>]
    >
  >;

  get rawName(): string {
    return this.tg.rawName;
  }

  private constructor(
    public tg: TypeGraph,
  ) {
    this.tg = tg;
    this.name = tg.name;
    this.queryCache = new QueryCache();
    this.logger = log.getLogger("engine");
    this.rest = {
      "GET": {},
      "POST": {},
      "PUT": {},
      "DELETE": {},
    };
  }

  static async init(
    payload: string,
    secrets: Record<string, string>,
    sync: boolean, // redis synchronization?
    response: PushResponse,
    customRuntime: RuntimeResolver = {},
    introspectionDefPayload: string | null = introspectionDefStatic,
  ) {
    const typegraph: TypeGraphDS = JSON.parse(payload);
    const typegraphName = TypeGraph.formatName(typegraph);
    response.typegraphName(typegraphName);

    // not prefixed!
    const secretManager = new SecretManager(typegraph.types[0].title, secrets);

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

    const engine = new Engine(tg);
    await engine.registerEndpoints();
    return engine;
  }

  private async registerEndpoints() {
    for (const query of this.tg.tg.meta.queries.endpoints) {
      const document = parse(query);

      const [operation, fragments] = findOperation(document, None);
      const unwrappedOperation = operation.unwrap();
      const name = unwrappedOperation.name?.value;
      if (!name) {
        throw new Error("query name is required");
      }

      const [plan] = await this.getPlan(
        unwrappedOperation,
        fragments,
        false,
        false,
      );

      const effects = Array.from(new Set(
        plan.stages.filter((s) => s.props.parent == null).map((s) =>
          s.props.effect
        ),
      ).values());
      if (effects.length !== 1) {
        throw new Error("root fields in query must be of the same effect");
      }
      const [effect] = effects;

      const casting = (v: ast.TypeNode): (_: any) => unknown => {
        if (v.kind === "NonNullType") {
          return casting(v.type);
        }
        if (v.kind === "ListType") {
          return JSON.parse;
        }
        const name = v.name.value;
        if (name === "Integer") {
          return parseInt;
        }
        if (name === "Float") {
          return parseFloat;
        }
        if (name === "Boolean") {
          return Boolean;
        }
        if (name === "String" || name == "ID") {
          return String;
        }
        return JSON.parse;
      };

      const parsingVariables = Object.fromEntries(
        (unwrappedOperation.variableDefinitions ?? []).map((varDef) => {
          const name = varDef.variable.name.value;
          return [name, casting(varDef.type)];
        }),
      );

      const checkVariables = (vars: Record<string, unknown>) => {
        const variables = Object.fromEntries(
          Object.entries(vars).map(([k, v]) => [k, parsingVariables[k](v)]),
        );

        this.checkVariablesPresence(
          unwrappedOperation.variableDefinitions ?? [],
          variables,
        );
        return variables;
      };

      this.rest[effectToMethod[effect!]][name] = [plan, checkVariables];
    }
  }

  async terminate() {
    return await this.tg.deinit();
  }

  materialize(
    stages: ComputeStage[],
    verbose: boolean,
  ): ComputeStage[] {
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
    for (const _stage of stages) {
      // optimize
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

  async computePlan(
    plan: Plan,
    variables: Variables,
    context: Context,
    info: Info,
    limit: RateLimit | null,
    verbose: boolean,
  ): Promise<JSONValue> {
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

    validator(res);

    return res;
  }

  checkVariablesPresence(
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
}
