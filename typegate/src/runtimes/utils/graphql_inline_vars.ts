// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { JSONValue } from "../../utils.ts";
import type { FromVars } from "../graphql.ts";
import { filterValues } from "std/collections/filter_values.ts";
import {
  ComputeArg,
  DEFAULT_COMPUTE_PARAMS,
} from "../../engine/planner/args.ts";
import { mapValues } from "std/collections/map_values.ts";
import { isNameContinue, isNameStart } from "graphql/characters";

export function stringifyQL(
  obj: JSONValue,
): string {
  if (Array.isArray(obj)) {
    return `[${obj.map((obj) => stringifyQL(obj)).join(", ")}]`;
  }

  if (typeof obj === "object" && obj !== null) {
    const entries = Object.entries(obj).map(
      ([k, v]) => `${k}: ${stringifyQL(v)}`,
    ).join(", ");
    return `{ ${entries} }`;
  }

  return JSON.stringify(obj);
}

function formatArgs(
  args: ComputeArg<Record<string, unknown>> | null,
  vars: Record<string, unknown>,
) {
  if (args == null) {
    return "";
  }
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
      `${argName}: ${stringifyQL(argValue as JSONValue)}`
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
  const [varDefs, templateQuery] = generateTemplateQuery(query, variables);
  const varList = variables.join(", ");
  const generateQueryCode = [
    `const { ${varList} } = vars;`,
    ...varDefs,
    `return ${templateQuery}`,
  ].join("\n");
  const generateQuery = new Function("vars", generateQueryCode) as FromVars<
    string
  >;
  return (variables) => {
    const varExpressions = mapValues(variables, (v) => {
      const expr = stringifyQL(v as JSONValue);
      return expr;
    });
    return generateQuery(varExpressions);
  };
}

function generateTemplateQuery(query: string, variables: string[]) {
  const varDefs = [];
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

  varDefs.push(`const argList = \`${formattedArgList}\`;`);
  parts.push(`\${ argList && \`(\n\${argList}  )\`}`);
  cursor = argListEnd + 1;

  parts.push(query.slice(cursor));
  parts.push("`");
  return [varDefs, parts.join("")] as const;
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
      `\${ ${varName} == "null" ? "" : \`    ${argName}: \${${varName}}\\n\` }`,
    );
  }
}

function unknownVariableError(query: string, varName: string): Error {
  return new Error(`Unknown variable $${varName} found in query: ${query}`);
}
