import { JSONValue } from "../../utils.ts";
import type { FromVars } from "../GraphQLRuntime.ts";
import { ComputeStage } from "../../engine.ts";
import * as ast from "graphql_ast";
import { unparse } from "../../utils.ts";

function unzip<A, B>(arrays: ([A, B])[]): [A[], B[]] {
  const as: A[] = [];
  const bs: B[] = [];
  arrays.forEach(([a, b]) => {
    as.push(a);
    bs.push(b);
  });
  return [as, bs];
}

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

  let cursor = 0;
  while (cursor < stages.length) {
    const stage = stages[cursor];
    const children = stages.slice(cursor + 1).filter((s) =>
      s.id().startsWith(stage.id())
    );
    console.log("path", stage.props.path);

    const field = stage.props.path[stage.props.path.length - 1];
    query += " ";
    query += field !== stage.props.node ? field + ": " : "";
    query += renames[stage.props.node] ?? stage.props.node;
    if (Object.keys(stage.props.args).length > 0) {
      query += "(";
      query += Object.entries(stage.props.args).map(
        ([argName, argValue]) => {
          console.log({ argName, argValue });
          const val = argValue({}, null);
          console.log({ val });
          if (typeof val === "function") {
            const varName = val(null);
            console.log({ varName });
            forwardVar(varName);
            return `${argName}: $${varName}`;
          }
          const [q, vars] = stringifyQL(val as JSONValue);
          vars.forEach(forwardVar);
          return `${argName}: ${q}`;
        },
      ).join(", ");
      query += ")";
    }
    if (children.length > 0) {
      query += " {";
      const [q, vars] = rebuildGraphQuery({
        stages: children,
        renames,
        varDefs,
      });
      query += q;
      query += " }";
      Object.assign(forwardedVars, vars);
    }
    cursor += 1 + children.length;
  }
  return [query, forwardedVars];
}
