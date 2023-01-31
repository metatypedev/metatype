// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { iterParentStages, JSONValue } from "../../utils.ts";
import type { FromVars } from "../graphql.ts";
import { ComputeStage } from "../../engine.ts";
import { filterValues } from "std/collections/filter_values.ts";
import { mapValues } from "std/collections/map_values.ts";
import { ComputeArg } from "../../planner/args.ts";

export function stringifyQL(
  obj: JSONValue | FromVars<JSONValue>,
): FromVars<string> {
  if (typeof obj === "function") {
    return (vars) => stringifyQL(obj(vars))(vars);
  }

  if (Array.isArray(obj)) {
    return (vars) => `[${obj.map((obj) => stringifyQL(obj)(vars)).join(", ")}]`;
  }

  if (typeof obj === "object" && obj !== null) {
    return (vars) =>
      `{ ${
        Object.entries(obj).map(([k, v]) => `${k}: ${stringifyQL(v)(vars)}`)
      } }`;
  }

  return (_vars) => JSON.stringify(obj);
}

export interface RebuildQueryParam {
  stages: ComputeStage[];
  renames: Record<string, string>;
}

export function rebuildGraphQuery(
  { stages, renames }: RebuildQueryParam,
): FromVars<string> {
  const ss: Array<FromVars<string>> = [];

  iterParentStages(stages, (stage, children) => {
    const field = stage.props.path[stage.props.path.length - 1];
    ss.push(() =>
      ` ${field !== stage.props.node ? field + ": " : ""}${
        renames[stage.props.node] ?? stage.props.node
      }`
    );

    if (Object.keys(stage.props.args).length > 0) {
      ss.push((vars) => formatArgs(stage.props.args, vars));
    }

    if (children.length > 0) {
      ss.push((vars) =>
        ` {${rebuildGraphQuery({ stages: children, renames })(vars)} }`
      );
    }
  });

  return (vars) => ss.map((s) => s(vars)).join("");
}

function formatArgs(
  args: Record<string, ComputeArg>,
  vars: Record<string, unknown>,
) {
  const computedArgs = Object.entries(
    filterValues(
      mapValues(args, (c) => c(vars, {}, {})),
      (v) => v != undefined,
    ),
  );
  if (computedArgs.length === 0) {
    return "";
  }
  return `(${
    computedArgs.map(([argName, argValue]) =>
      `${argName}: ${stringifyQL(argValue as JSONValue)(vars)}`
    ).join(", ")
  })`;
}

export function buildRawQuery(
  fn: "queryRaw" | "executeRaw",
  sql: string,
  args: Record<string, ComputeArg>,
  vars: Record<string, unknown>,
) {
  const formattedArgs = formatArgs({ ...args, query: () => sql }, vars);
  return `${fn}${formattedArgs}`;
}
