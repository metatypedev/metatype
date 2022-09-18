import Dataloader from "npm:dataloader@2.1.0";
import { Kind, parse } from "graphql";
import type ast from "graphql_ast";
import { RuntimeResolver, TypeGraph, TypeMaterializer } from "./typegraph.ts";
import { ensure, JSONValue, mapo, Maybe, unparse } from "./utils.ts";
import { findOperation, FragmentDefs } from "./graphql.ts";
import { TypeGraphRuntime } from "./runtimes/TypeGraphRuntime.ts";
import * as log from "std/log/mod.ts";
import { dirname, fromFileUrl, join } from "std/path/mod.ts";
import { sha1, unsafeExtractJWT } from "./crypto.ts";
import type {
  Batcher,
  Resolver,
  Runtime,
  RuntimeConfig,
} from "./runtimes/Runtime.ts";
import { ResolverError } from "./errors.ts";
import { getCookies } from "std/http/cookie.ts";
import { TypeNode } from "./type-node.ts";
import { Auth } from "./auth.ts";

const localDir = dirname(fromFileUrl(import.meta.url));
const introspectionDefStatic = await Deno.readTextFile(
  join(localDir, "typegraphs/introspection.json"),
).then((d) => JSON.parse(d));

export const initTypegraph = async (
  payload: string,
  customRuntime: RuntimeResolver = {},
  config: Record<string, RuntimeConfig> = {},
  introspectionDef: any = introspectionDefStatic,
) => {
  const parsed = JSON.parse(payload);

  const introspection = introspectionDef
    ? await TypeGraph.init(
      introspectionDef,
      {
        typegraph: await TypeGraphRuntime.init(parsed, [], {}, config),
      },
      null,
      {},
    )
    : null;
  const tg = await TypeGraph.init(parsed, customRuntime, introspection, {});

  const engine = new Engine(tg);
  return engine;
};

/**
 * A function that computes argument from parent, variables and context
 * Pass null `variables` to get a FromVars<_> that computes the argument value
 * from variables or returns the variable name if the `variables` param is null.
 */
export interface ComputeArg {
  (
    parent: Record<string, unknown>,
    variables: Record<string, unknown> | null,
    context: Record<string, unknown>,
  ): unknown;
}

interface ComputeStageProps {
  dependencies: string[];
  parent?: ComputeStage;
  args: Record<string, ComputeArg>;
  policies: Record<string, string[]>;
  resolver?: Resolver;
  outType: TypeNode; // only temp
  runtime: Runtime;
  materializer?: TypeMaterializer;
  batcher: Batcher;
  node: string;
  path: string[];
}

export type PolicyStage = () => Promise<boolean | null>;
export type PolicyStages = Record<string, PolicyStage>;
export type PolicyStagesFactory = (claim: Record<string, any>) => PolicyStages;
/*
..
a(b: c) {
  ..
}
..
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
    }\nid  ${this.id()}\ntype ${this.props.outType.typedef}\narg ${
      JSON.stringify(this.props.args)
    }\n--`;
  }
}

const authorize = async (
  stageId: string,
  checks: string[],
  policiesRegistry: PolicyStages,
  verbose: boolean,
): Promise<true | null> => {
  if (Object.values(checks).length < 1) {
    // null = inherit
    return null;
  }

  const [check, ...nextChecks] = checks;
  const decision = await policiesRegistry[check]();
  verbose && console.log(stageId, decision);

  if (decision === null) {
    // next policy
    return authorize(stageId, nextChecks, policiesRegistry, verbose);
  }

  if (!decision) {
    // exception = reject
    throw Error(`authorization failed for ${check} in ${stageId}`);
  }

  // true = pass
  return true;
};

// typechecks for scalar types
const typeChecks: Record<string, (value: unknown) => boolean> = {
  Int: (value) => typeof value === "number",
  Float: (value) => typeof value === "number",
  String: (value) => typeof value === "string",
  ID: (value) => typeof value === "string",
  Boolean: (value) => typeof value === "boolean",
};

export class Engine {
  tg: TypeGraph;
  name: string;
  queryCache: Record<string, [ComputeStage[], PolicyStagesFactory]>;
  logger: log.Logger;

  constructor(tg: TypeGraph) {
    this.tg = tg;
    this.name = tg.tg.types[0].name;
    this.queryCache = {};
    this.logger = log.getLogger("engine");
  }

  async terminate() {
    return await this.tg.deinit();
  }

  async compute(
    plan: ComputeStage[],
    policesFactory: PolicyStagesFactory,
    context: Record<string, unknown>,
    variables: Record<string, unknown>,
    verbose: boolean,
  ): Promise<JSONValue> {
    const ret = {};
    const cache: Record<string, unknown> = {};
    const lenses: Record<string, unknown> = {};
    const policiesRegistry = policesFactory(context);

    for await (const stage of plan) {
      const {
        dependencies,
        args,
        policies,
        resolver,
        path,
        parent,
        batcher,
        node,
      } = stage.props;

      const decisions = await Promise.all(
        Object.values(policies).map((checks) =>
          authorize(stage.id(), checks, policiesRegistry, verbose)
        ),
      );
      if (
        node !== "" &&
        !parent &&
        (decisions.some((d) => d === null) || decisions.length < 1)
      ) {
        // root level field inherit false
        throw Error(
          `no authorization policy took a decision in root field ${stage.id()}`,
        );
      }

      const deps = dependencies
        .filter((dep) => dep !== parent?.id())
        .filter((dep) => !(parent && dep.startsWith(`${parent.id()}.`)))
        .reduce((agg, dep) => ({ ...agg, [dep]: cache[dep] }), {});

      //verbose && console.log("dep", stage.id(), deps);
      const previousValues = parent ? cache[parent.id()] : ([{}] as any);
      const lens = parent ? lenses[parent.id()] : ([ret] as any);

      const res = await Promise.all(
        previousValues.map((parent: any) =>
          resolver!({
            ...mapo(args, (e) => e(parent, variables, context)),
            _: {
              parent: parent ?? {},
              context,
              variables,
              ...deps,
            },
          })
        ),
      );

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

  traverse(
    operation: ast.OperationDefinitionNode,
    fragments: FragmentDefs,
    verbose: boolean,
  ): [ComputeStage[], PolicyStagesFactory] {
    const serial = operation.operation === "mutation";
    const stages = this.tg.traverse(
      fragments,
      operation.name?.value ?? "",
      [],
      operation.selectionSet,
      verbose,
      [],
      0,
      undefined,
      serial,
    );

    const varTypes: Record<string, string> =
      (operation?.variableDefinitions ?? []).reduce(
        (agg, { variable, type }) => ({
          ...agg,
          [variable.name.value]: unparse(type.loc!),
        }),
        {},
      );

    for (const stage of stages) {
      stage.varTypes = varTypes;
    }

    const policies = this.tg.preparePolicies(stages);
    return [stages, policies];
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

  optimize(stages: ComputeStage[], verbose: boolean): ComputeStage[] {
    //verbose && console.log(stages);

    for (const stage of stages) {
      //verbose && console.log("opti", stage.id());
    }

    return stages;
  }

  async getPlan(
    operation: ast.OperationDefinitionNode,
    fragments: FragmentDefs,
    cache: boolean,
    verbose: boolean,
  ): Promise<[ComputeStage[], PolicyStagesFactory, boolean]> {
    const id = await sha1(
      JSON.stringify(operation) + JSON.stringify(fragments),
    );

    if (cache && id in this.queryCache) {
      return [...this.queryCache[id], true];
    }

    // what
    const [stages, policies] = this.traverse(operation, fragments, verbose);
    /*
    this.logger.info(
      "stages:",
      ["", ...stages.map((s) => s.toString())].join("\n")
    );
    */

    // how
    const stagesMat = this.materialize(stages, verbose);

    // when
    const plan = this.optimize(stagesMat, verbose);

    if (cache) {
      this.queryCache[id] = [plan, policies];
    }

    return [plan, policies, false];
  }

  async execute(
    query: string,
    operationName: Maybe<string>,
    variables: Record<string, unknown>,
    context: Record<string, unknown>,
  ): Promise<{ status: number; [key: string]: JSONValue }> {
    try {
      const document = parse(query);

      const [operation, fragments] = findOperation(document, operationName);
      if (!operation) {
        throw Error(`operation ${operationName} not found`);
      }

      this.validateVariables(operation?.variableDefinitions ?? [], variables);

      const cache = operationName === "IntrospectionQuery";
      const verbose = operationName !== "IntrospectionQuery";

      verbose && this.logger.info("———");
      verbose && this.logger.info("op:", operationName);

      const startTime = performance.now();
      const [plan, policies, cacheHit] = await this.getPlan(
        operation,
        fragments,
        cache,
        verbose,
      );
      const planTime = performance.now();

      //logger.info("dag:", stages);
      const res = await this.compute(
        plan,
        policies,
        context,
        variables,
        verbose,
      );
      const endTime = performance.now();

      verbose &&
        this.logger.info(
          `${cacheHit ? "fetched" : "planned"}  in ${
            (
              planTime - startTime
            ).toFixed(2)
          }ms`,
        );
      verbose &&
        this.logger.info(`computed in ${(endTime - planTime).toFixed(2)}ms`);
      //logger.info("res:", res);

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
  ): Promise<[Record<string, unknown>, Headers]> {
    if (this.tg.auths.size === 0) {
      return [{}, new Headers()];
    }

    let [kind, token] = (headers.get("Authorization") ?? "").split(" ");
    if (!token) {
      const name = this.tg.root.name;
      token = getCookies(headers)[name];
    }

    if (!token) {
      return [{}, new Headers()];
    }

    let auth = null;

    if (kind === "basic") {
      auth = this.tg.auths.get("basic");
    } else if (this.tg.auths.size === 1) {
      auth = this.tg.auths.values().next().value;
    } else {
      try {
        const { provider } = await unsafeExtractJWT(token);
        auth = this.tg.auths.get(provider as string);
      } catch {
        // malformed jwt
      }
    }

    if (!auth) {
      return [{}, new Headers()];
    }

    return await auth.tokenMiddleware(token);
  }
}
