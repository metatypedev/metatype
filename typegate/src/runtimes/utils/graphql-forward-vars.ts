import { JSONValue, unparse, unzip } from "../../utils.ts";
import type { FromVars } from "../GraphQLRuntime.ts";
import { ComputeStage } from "../../engine.ts";
import * as ast from "graphql_ast";
import { iterParentStages } from "../../utils.ts";

export function stringifyQL(
  obj: JSONValue | FromVars<JSONValue>,
): [q: string, vars: string[]] {
  if (typeof obj === "function") {
    const varName = obj(null as unknown as Record<string, unknown>);
    // assert typeof varName === "string"
    return [`$${varName}`, [varName as string]];
  }

  if (Array.isArray(obj)) {
    const [qs, vars] = unzip(obj.map(stringifyQL));
    return [`[${qs.join(", ")}]`, vars.flat(1)];
  }

  if (typeof obj === "object" && obj != null) {
    const [qs, vars] = unzip(Object.entries(obj)!.map(([k, v]) => {
      const [q, vars] = stringifyQL(v);
      return [[k, q] as const, vars];
    }));
    return [
      `{${
        qs.map(([k, v]) => `${k}: ${v}`)
          .join(", ")
      }}`,
      vars.flat(1),
    ];
  }

  return [JSON.stringify(obj), []];
}

export interface RebuildQueryParam {
  stages: ComputeStage[];
  renames: Record<string, string>;
  varDefs: Record<string, ast.VariableDefinitionNode>;
}

export function rebuildGraphQuery(
  { stages, renames, varDefs }: RebuildQueryParam,
): [query: string, forwaredVars: Record<string, string>] {
  let query = "";
  const forwardedVars: Record<string, string> = {};
  const forwardVar = (name: string) => {
    if (!Object.hasOwnProperty.call(forwardedVars, name)) {
      forwardedVars[name] = unparse(varDefs[name].loc!);
    }
  };

  iterParentStages(stages, (stage, children) => {
    const field = stage.props.path[stage.props.path.length - 1];
    query += ` ${field !== stage.props.node ? field + ": " : ""}${
      renames[stage.props.node] ?? stage.props.node
    }`;
    if (Object.keys(stage.props.args).length > 0) {
      query += `(${
        Object.entries(stage.props.args).map(
          ([argName, argValue]) => {
            const val = argValue({}, null);
            if (typeof val === "function") {
              const varName = val(null);
              forwardVar(varName);
              return `${argName}: $${varName}`;
            }
            const [q, vars] = stringifyQL(val as JSONValue);
            vars.forEach(forwardVar);
            return `${argName}: ${q}`;
          },
        ).join(", ")
      })`;
    }
    if (children.length > 0) {
      const [q, vars] = rebuildGraphQuery({
        stages: children,
        renames,
        varDefs,
      });
      query += ` {${q} }`;
      Object.assign(forwardedVars, vars);
    }
  });
  return [query, forwardedVars];
}
