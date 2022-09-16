import { iterParentStages, JSONValue } from "../../utils.ts";
import type { FromVars } from "../GraphQLRuntime.ts";
import { ComputeStage } from "../../engine.ts";

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
      ss.push((vars) =>
        `(${
          Object.entries(stage.props.args).map(([argName, argValue]) => {
            return `${argName}: ${
              stringifyQL(
                argValue({}, null, {}) as JSONValue | FromVars<JSONValue>,
              )(vars)
            }`;
          }).join(", ")
        })`
      );
    }

    if (children.length > 0) {
      ss.push((vars) =>
        ` {${rebuildGraphQuery({ stages: children, renames })(vars)} }`
      );
    }
  });

  return (vars) => ss.map((s) => s(vars)).join("");
}
