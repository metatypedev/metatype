import { ComputeStage } from "../engine.ts";
import { gq } from "../gq.ts";
import { JSONValue } from "../utils.ts";
import { Resolver, Runtime } from "./Runtime.ts";
import { RuntimeInitParams } from "./Runtime.ts";
import * as ast from "graphql_ast";
import { unparse } from "../utils.ts";

export interface FromVars<T> {
  (variables: Record<string, unknown>): T;
}

function stringifyQL(obj: JSONValue): string | FromVars<string>;
function stringifyQL(obj: FromVars<JSONValue>): FromVars<string>;
function stringifyQL(
  obj: JSONValue | FromVars<JSONValue>,
): string | FromVars<string> {
  if (typeof obj === "function") {
    return (vars) => {
      let val = stringifyQL(obj(vars));
      while (typeof val === "function") {
        val = val(vars);
      }
      return val;
    };
  }
  if (Array.isArray(obj)) {
    const mapped = obj.map((obj) => stringifyQL(obj));
    if (mapped.some((item) => typeof item === "function")) {
      return (vars) =>
        `[${
          mapped.map((item) => typeof item === "function" ? item(vars) : item)
            .join(", ")
        }]`;
    }
    return `[${obj.map((obj) => stringifyQL(obj)).join(", ")}]`;
  }
  if (typeof obj === "object" && obj !== null) {
    const mapped = Object.entries(obj).map(([k, v]) => [k, stringifyQL(v)]);
    if (mapped.some(([_k, v]) => typeof v === "function")) {
      return (vars) =>
        `{${
          mapped.map(([k, v]) =>
            `${k}: ${typeof v === "function" ? v(vars) : v}`
          ).join(", ")
        }}`;
    }
    const values = mapped
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    return `{${values}}`;
  }
  return JSON.stringify(obj);
}

interface RebuildQueryParam {
  stages: ComputeStage[];
  renames: Record<string, string>;
  forwardVars: boolean;
  varDefs: Record<string, ast.VariableDefinitionNode>;
}

function rebuildGraphQuery(
  param: RebuildQueryParam & { forwardVars: true },
): [query: string, forwardedVars: Record<string, string>];
function rebuildGraphQuery(
  param: RebuildQueryParam & { forwardVars: false },
): string | FromVars<string>;
function rebuildGraphQuery(
  { stages, renames, forwardVars, varDefs }: RebuildQueryParam,
): [string, Record<string, string>] | string | FromVars<string> {
  /** query substrings */
  const ss: Array<string | FromVars<string>> = [];
  const forwardedVars: Record<string, string> = {};
  let cursor = 0;
  while (cursor < stages.length) {
    const stage = stages[cursor];
    const children = stages
      .slice(cursor + 1)
      .filter((s) => s.id().startsWith(stage.id()));
    const field = stage.props.path[stage.props.path.length - 1];
    ss.push(
      ` ${field !== stage.props.node ? field + ": " : ""}${
        renames[stage.props.node] ?? stage.props.node
      }`,
    );
    if (Object.keys(stage.props.args).length > 0) {
      ss.push(`(`);
      Object.entries(stage.props.args).forEach(([argName, argValue], idx) => {
        if (idx > 0) ss.push(", ");
        ss.push(`${argName}: `);
        const val = argValue({}, null);
        if (typeof val === "function") {
          // variable reference
          if (forwardVars) {
            const name = val(null);
            ss.push(`$${name}`);
            if (!Object.prototype.hasOwnProperty.call(forwardedVars, name)) {
              forwardedVars[name] = unparse(varDefs[name].loc!);
            }
          } else {
            ss.push(stringifyQL(val as FromVars<JSONValue>));
          }
        } else {
          console.log({ val });
          ss.push(stringifyQL(val as JSONValue));
        }
      });
      ss.push(")");
    }
    if (children.length > 0) {
      ss.push(" {");
      if (forwardVars) {
        const [q, vars] = rebuildGraphQuery({
          stages: children,
          renames,
          forwardVars: true,
          varDefs,
        });
        ss.push(q);
        Object.assign(forwardedVars, vars);
      } else {
        ss.push(rebuildGraphQuery({
          stages: children,
          renames,
          forwardVars: false,
          varDefs,
        }));
      }
      ss.push(" }");
    }
    cursor += 1 + children.length;
  }
  if (forwardVars) {
    return [(ss as string[]).join(""), forwardedVars];
  } else {
    if (ss.every((s) => typeof s === "string")) {
      return ss.join("");
    } else {
      return (vars) =>
        ss.reduce(
          (agg: string, s) => agg + (typeof s === "string" ? s : s(vars)),
          "",
        );
    }
  }
}

export class GraphQLRuntime extends Runtime {
  endpoint: string;
  forwardVars = true;

  constructor(endpoint: string) {
    super();
    this.endpoint = endpoint;
  }

  disableVariables() {
    this.forwardVars = false;
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    const { args } = params;
    return await new GraphQLRuntime(args.endpoint as string);
  }

  async deinit(): Promise<void> {}

  execute(query: string | FromVars<string>): Resolver {
    return async ({ _: { variables } }) => {
      const q = typeof query === "function" ? query(variables) : query;
      console.log(`remote query: ${q}`);
      // TODO: filter variables - only include forwared variables
      const ret = await gq(this.endpoint, q, variables);
      return ret.data;
    };
  }

  materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    operation: ast.OperationDefinitionNode,
    verbose: boolean,
  ): ComputeStage[] {
    const stagesMat: ComputeStage[] = [];

    const serial = stage.props.materializer?.data.serial;
    const sameRuntime = Runtime.collectRelativeStages(stage, waitlist);
    const fields = [stage, ...sameRuntime];
    const renames: Record<string, string> = {
      ql: "typegraph",
    };
    for (const field of fields) {
      const { node, materializer: mat } = field.props;
      if (mat?.name == "prisma_operation") {
        const { operation, table } = mat.data as {
          operation: string;
          table: string;
        };
        renames[node] = operation + table;
      }
    }

    const query = (() => {
      const op = serial ? "mutation" : "query";
      console.log("forwardVars", this.forwardVars);
      if (this.forwardVars) {
        const varDefs = (operation?.variableDefinitions ?? []).reduce(
          (agg, { variable, type }) => ({
            ...agg,
            [variable.name.value]: type,
          }),
          {},
        );
        const [rebuiltQuery, forwardedVars] = rebuildGraphQuery({
          stages: fields,
          renames,
          forwardVars: true,
          varDefs,
        });
        const vars = Object.entries(forwardedVars).map(([name, type]) =>
          `$${name}: ${type}`
        ).join(", ");
        return `${op} Q${
          vars.length === 0 ? "" : `(${vars})`
        } {${rebuiltQuery} }`;
      } else {
        const query = rebuildGraphQuery({
          stages: fields,
          renames,
          forwardVars: false,
          varDefs: {},
        });
        if (typeof query === "function") {
          return (vars: Record<string, unknown>) => `${op} {${query(vars)} }`;
        } else {
          return `${op} q {${query} }`;
        }
      }
    })();

    verbose &&
      console.log(
        "remote graphql:",
        typeof query === "string" ? query : " with inlined vars",
      );

    const queryStage = new ComputeStage({
      dependencies: [],
      args: {},
      policies: {},
      resolver: this.execute(query),
      outType: {
        // dummy
        name: "string",
        typedef: "string",
        edges: [],
        policies: [],
        runtime: -1,
        data: {},
      },
      runtime: stage.props.runtime,
      batcher: (x: any) => x,
      node: "",
      path: [...stage.props.path.slice(0, -1), "query"],
    });
    stagesMat.push(queryStage);

    for (const field of fields) {
      if (field.props.parent?.id() === stage.props.parent?.id()) {
        const resolver: Resolver = ({
          _: { parent, [queryStage.id()]: queryRes },
        }) => {
          const fieldName = field.props.path[field.props.path.length - 1];
          const resolver = queryRes[0][renames[fieldName] ?? fieldName];
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
      }
    }

    return stagesMat;
  }
}
