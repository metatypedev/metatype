// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { iterParentStages, JSONValue } from "../../utils.ts";
import type { FromVars } from "../graphql.ts";
import { ComputeStage } from "../../engine.ts";
import { filterValues } from "std/collections/filter_values.ts";
import { ComputeArg, DEFAULT_COMPUTE_PARAMS } from "../../planner/args.ts";
import { mapValues } from "std/collections/map_values.ts";
import { isNameContinue, isNameStart } from "graphql/characters";

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
  additionalSelections?: string[];
}

export function rebuildGraphQuery(
  { stages, renames, additionalSelections = [] }: RebuildQueryParam,
): FromVars<string> {
  const ss: Array<FromVars<string>> = [];

  iterParentStages(stages, (stage, children) => {
    const field = stage.props.path[stage.props.path.length - 1];
    ss.push(() =>
      ` ${field !== stage.props.node ? field + ": " : ""}${
        renames[stage.props.node] ?? stage.props.node
      }`
    );

    ss.push((vars) => formatArgs(stage.props.args, vars));

    if (children.length > 0) {
      ss.push((vars) =>
        ` {${
          rebuildGraphQuery({
            stages: children,
            renames,
            additionalSelections: stage.props.additionalSelections,
          })(vars)
        } }`
      );
    }
  });

  for (const sel of additionalSelections) {
    ss.push(() => ` ${sel}`);
  }

  return (vars) => ss.map((s) => s(vars)).join("");
}

function formatArgs(
  args: ComputeArg<Record<string, unknown>> | null,
  vars: Record<string, unknown>,
) {
  if (args == null) {
    return "";
  }
  // TODO inject parent context ..
  const computedArgs = Object.entries(
    filterValues(
      args({ ...DEFAULT_COMPUTE_PARAMS, variables: vars }),
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
  args: ComputeArg<Record<string, unknown>> | null,
  vars: Record<string, unknown>,
) {
  const computeArgs = args ?? (() => ({}));
  const formattedArgs = formatArgs(
    (...deps) => ({ ...computeArgs(...deps), query: sql }),
    vars,
  );
  return `${fn}${formattedArgs}`;
}

// We expect to have variables only as argument values (only top level);
// and all argument values shall be variable references.
export function withInlinedVars(
  query: string,
  variables: string[],
): FromVars<string> {
  const templateQuery = generateTemplateQuery(query, variables);
  const varList = variables.join(", ");
  const generateQueryCode =
    `const { ${varList} } = vars;\nreturn ${templateQuery}`;
  const generateQuery = new Function("vars", generateQueryCode) as FromVars<
    string
  >;
  return (variables) => {
    const varExpressions = mapValues(variables, (v) => {
      const expr = stringifyQL(v as JSONValue);
      if (typeof expr === "function") return expr(variables);
      return expr;
    });
    const q = generateQuery(varExpressions);
    // TODO Temp
    return q.split("\n").filter((line) => line.indexOf(": null") < 0).join(
      "\n",
    );
  };
}

function generateTemplateQuery(query: string, variables: string[]) {
  const parts = ["`"];
  let cursor = 0;
  const paramListStart = query.indexOf("(", cursor);
  const paramListEnd = query.indexOf(")", paramListStart);
  parts.push(query.slice(cursor, paramListStart));
  cursor = paramListEnd + 1;

  const varNames = new Set(variables);
  const argListStart = query.indexOf("(", cursor);
  parts.push(query.slice(cursor, argListStart));

  const [formattedArgList, argListEnd] = formatArgList(
    query,
    argListStart + 1,
    varNames,
  );
  parts.push(`(\n${formattedArgList})`);
  cursor = argListEnd + 1;

  parts.push(query.slice(cursor));
  parts.push("`");
  return parts.join("");
}

// Return template string for argument list.
// Null arguments are skipped since prisma does not support them.
function formatArgList(
  query: string,
  position: number,
  variables: Set<string>,
): [string, number] {
  const parts: string[] = [];
  let cursor = position;

  while (true) {
    while (!isNameStart(query.charCodeAt(cursor))) {
      if (query.charAt(cursor) === ")") {
        return [parts.join(""), cursor];
      }
      cursor += 1;
    }

    let nameEnd = cursor;
    while (isNameContinue(query.charCodeAt(nameEnd))) {
      nameEnd += 1;
    }
    const argName = query.slice(cursor, nameEnd);
    cursor = nameEnd;

    const varNameStart = query.indexOf("$", cursor);
    if (query.slice(cursor, varNameStart).trim() !== ":") {
      throw new Error(
        `syntax error at ${cursor}: '${query.slice(cursor, varNameStart)}'`,
      );
    }

    cursor = varNameStart + 1;
    let varNameEnd = varNameStart + 1;
    while (isNameContinue(query.charCodeAt(varNameEnd))) {
      varNameEnd += 1;
    }
    const varName = query.slice(varNameStart + 1, varNameEnd);
    cursor = varNameEnd;

    if (!variables.has(varName)) {
      throw unknownVariableError(varName, query);
    }

    parts.push(
      `\${ ${varName} == null ? "" : \`    ${argName}: \${${varName}}\\n\` }`,
    );
  }
}

function unknownVariableError(query: string, varName: string): Error {
  return new Error(`Unknown variable $${varName} found in query: ${query}`);
}
