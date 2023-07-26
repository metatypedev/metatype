// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { parse } from "graphql";
import * as ast from "graphql/ast";
import type { TypeGraph } from "./typegraph.ts";
import { JSONValue } from "./utils.ts";
import { findOperation, FragmentDefs } from "./graphql.ts";
import * as log from "std/log/mod.ts";
import { sha1 } from "./crypto.ts";
import { RateLimit } from "./typegate/rate_limiter.ts";
import type {
  ComputeStageProps,
  Context,
  Info,
  Resolver,
  Variables,
} from "./types.ts";
import { Planner } from "./planner/mod.ts";
import { OperationPolicies } from "./planner/policies.ts";
import { None } from "monads";
import { Validator } from "./typecheck/common.ts";
import { generateValidator } from "./typecheck/result.ts";
import { ComputationEngine } from "./engine/computation_engine.ts";
import { isIntrospectionQuery } from "./services/graphql_service.ts";
import { ObjectNode } from "./type_node.ts";
import { RestSchemaGenerator } from "./typecheck/rest_schema_generator.ts";

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

export interface EndpointToSchemaMap {
  [index: string]: { fnName: string; outputSchema: unknown };
}

export class Engine {
  name: string;
  queryCache: QueryCache;
  logger: log.Logger;
  rest: Record<
    string,
    Record<
      string,
      {
        plan: Plan;
        checkVariables: (v: Record<string, unknown>) => Record<string, unknown>;
        variables: Array<{ name: string; schema: unknown }>;
        endpointToSchema: EndpointToSchemaMap;
        refSchemas: Map<string, unknown>;
      }
    >
  >;

  get rawName(): string {
    return this.tg.rawName;
  }

  public constructor(
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

  async registerEndpoints() {
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
        if (name === "String" || name == "ID") {
          return String;
        }
        // ListType | Object | boolean | number: stringified
        return JSON.parse;
      };

      const schemaGenerator = new RestSchemaGenerator(this.tg);

      const endpointToSchema = {} as EndpointToSchemaMap;

      for (const selection of unwrappedOperation.selectionSet.selections) {
        const fnName = (selection as any)?.name?.value as string;
        if (fnName) {
          // Note: (query | mutation) <endpointName> { <fnName1>, <fnName2>, .. }
          const match = this.tg.tg.types
            .filter((tpe) =>
              tpe.type == "object" &&
              (tpe.title == "Query" || tpe.title == "Mutation") &&
              tpe.properties[fnName] != undefined
            ).shift() as ObjectNode;

          if (!match) {
            throw new Error(
              `invalid state: "${name}" in query definition not found in type list`,
            );
          }

          const typeIdx = match.properties?.[fnName];
          const endpointFunc = this.tg.type(typeIdx);
          if (endpointFunc.type != "function") {
            throw new Error(
              `invalid state: function expected, got "${endpointFunc.type}"`,
            );
          }

          endpointToSchema[name] = {
            fnName,
            outputSchema: schemaGenerator.generate(endpointFunc.output),
          };
        }
      }

      const parsingVariables = Object.fromEntries(
        (unwrappedOperation.variableDefinitions ?? []).map((varDef) => {
          const name = varDef.variable.name.value;
          return [name, casting(varDef.type)];
        }),
      );

      const checkVariables = (vars: Record<string, unknown>) => {
        const variables = Object.fromEntries(
          Object.entries(vars).map(([k, v]) => [k, parsingVariables[k]?.(v)]),
        );
        this.checkVariablesPresence(
          unwrappedOperation.variableDefinitions ?? [],
          variables,
        );
        return variables;
      };

      const toJSONSchema = (v: ast.TypeNode): unknown => {
        if (v.kind === "NonNullType") {
          return toJSONSchema(v.type);
        }
        if (v.kind === "ListType") {
          return { type: "array", items: toJSONSchema(v.type) };
        }
        const name = v.name.value;
        const schema = {
          "Integer": { type: "number" },
          "Float": { type: "number" },
          "Boolean": { type: "boolean" },
          "String": { type: "string" },
          "ID": { type: "string" },
        }?.[name];
        if (schema) {
          return schema;
        }
        // fallback objects
        return { type: "string" };
      };

      const varDefs = unwrappedOperation.variableDefinitions ?? [];
      const variables = varDefs.map((v) => ({
        name: v.variable.name.value,
        schema: toJSONSchema(v.type),
      }));

      this.rest[effectToMethod[effect!]][name] = {
        plan,
        checkVariables, // variable existence checker
        variables, // variable in query/body
        endpointToSchema, // schema according to tg
        refSchemas: schemaGenerator.refs,
      };
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
