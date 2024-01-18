// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

/**
 * Translate typegraph in python to deno (experimental) for version 0.3.2
 * A better implementation would be to
 * (1) parse the python source directly and 1-1 map the imports/functions + refer to the ambient node sdk to validate the imports or attempt to autoresolve them.
 * (2) emit typescript code directly from the serialized json.
 *
 * Usage:
 *   deno run -A --config=typegate/deno.jsonc dev/tg-py2ts.ts --file <file.py> [--force]
 */

import { basename, dirname, join } from "std/path/mod.ts";
import { parseFlags, resolve } from "./deps.ts";

const args = parseFlags(Deno.args, {
  string: ["file"],
  boolean: ["force", "print"],
});

if (!args.file) {
  console.error("No typegraph was given");
  Deno.exit(-1);
}

// Concept:
// source => step1 => step2(input step1) => .. => output

type ReplaceStep = { description: string; apply: (text: string) => string };
type Failure = { error: Error | string; stepDescription: string };
type StepResult = { output: string; errors: Array<Failure> };
type Cursor = { start: number; end: number; length: number; match: string };

function upperFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.substring(1);
}

function camelCase(str: string) {
  return str
    .split(/_+/g)
    .map((chunk, idx) => idx > 0 ? upperFirst(chunk) : chunk)
    .join("");
}

/**
 * Enhanced `indexOf` with regex support and position information
 */
function nextMatch(
  text: string,
  word: string | RegExp,
  pos = 0,
): Cursor | null {
  if (word instanceof RegExp) {
    const searchPos = Math.min(text.length, pos);
    const nextText = text.substring(searchPos);
    const res = word.exec(nextText);
    word.lastIndex = 0; // always reset (js!)
    return res
      ? {
        match: res[0],
        start: searchPos + res.index,
        end: searchPos + res.index + res[0].length - 1,
        length: res[0].length,
      }
      : null;
  }
  const start = text.indexOf(word, pos);
  return start >= 0
    ? {
      start,
      end: start + word.length - 1,
      match: word,
      length: word.length,
    }
    : null;
}

/**
 * Determine all indexOf with position information
 */
export function findCursors(
  text: string,
  word: string | RegExp,
): Array<Cursor> {
  const matches = [] as Array<Cursor>;

  let cursor = 0;
  while (cursor >= 0) {
    const res = nextMatch(text, word, cursor);
    if (res != null) {
      cursor = res.end;
      matches.push(res);
    } else {
      break;
    }
  }

  return matches;
}

/**
 * Capture args string in function-calls
 */
function captureInsideParenthesis(
  text: string,
  prefix: string | RegExp,
  offset?: number, // inclusive
): Cursor | null {
  const res = nextMatch(text, prefix, offset);

  if (res == null) {
    return null;
  }

  const searchStart = res.end + 1;
  let startPos = null;
  let parenthStack = 0;
  let lastOpenedParenth = -1;
  let expr = "";
  for (let i = searchStart; i < text.length; i++) {
    const char = text.charAt(i);
    const isParenthesis = char == "(" || char == ")";
    if (lastOpenedParenth < 0 && !isParenthesis) {
      if (/\s/.test(char)) {
        continue; // prefix\s*()
      } else {
        break; // prefix\s*something\s*()
      }
    }

    if (isParenthesis) {
      if (char == "(") {
        lastOpenedParenth = i;
        parenthStack += 1;
      } else {
        parenthStack -= 1;
      }
      // first "(" has closed or we reached a premature end
      if (parenthStack <= 0) break;
    }
    if (i > searchStart) {
      startPos = startPos == null ? i : startPos;
      expr += char;
    }
  }

  // no-op
  if (lastOpenedParenth == null) {
    return null;
  }

  if (parenthStack != 0) {
    const peekRadius = 10;
    throw new Error(
      `invalid parenthesis near .. ${
        text.substring(
          Math.max(0, lastOpenedParenth - peekRadius),
          Math.min(text.length, lastOpenedParenth + peekRadius),
        ).replace(/[\n\r]/g, "\\n")
          .trim()
      } ..`,
    );
  }

  const start = startPos ?? lastOpenedParenth; // handle 0 length epxr: prefix()
  return {
    start,
    end: start + expr.length,
    length: expr.length,
    match: expr,
  };
}

// Concept:
// source => step1 => step2(input step1) => .. => output
const chain: Array<ReplaceStep> = [
  {
    description: "imports",
    apply(text: string) {
      return text.replace(
        /from\s+(.+?)\s+import\s+(.+,?)\s/g,
        (m: string, pkg, imp) => {
          if (typeof pkg != "string") {
            throw new Error(
              `package expr invalid at "${m}", got ${typeof pkg}`,
            );
          }
          if (typeof imp != "string") {
            throw new Error(
              `import expr invalid at "${m}", got ${typeof imp}`,
            );
          }

          const pkgSplit = pkg.split(".");
          const [start, ...rem] = pkgSplit;
          const first = start == "typegraph" ? "" : start;
          const relPath = `${pkgSplit.length == 1 ? "/index" : ""}${
            [first, ...rem]
              .join("/")
          }`;
          const imports = imp.split(/\s*,\s*/)
            .map(camelCase)
            .join(", ");
          return `import { ${imports} } from "@typegraph/sdk${relPath}.js"\n`;
        },
      );
    },
  },
  {
    description: "Translate inline comments",
    apply(text: string) {
      return text
        .replace(/#(.*)(\s*?)/g, (_, start, end) => `//${start}${end}`);
    },
  },
  {
    description: "Translate typegraph body",
    apply(text: string) {
      // match name near def
      const tmp = text.match(/def\s+(\w*)\(.*\)\s*\:/);
      if (tmp == null) {
        throw new Error("could not extract typegraph name");
      }
      const [tgDefExpr, tgName] = tmp!;
      const defOffset = text.lastIndexOf(tgDefExpr);
      const body = text.substring(defOffset + tgDefExpr.length);

      // match <expr> in @typegraph(<expr>)
      const prefixTg = "@typegraph";
      const cursor = text.lastIndexOf(prefixTg) + prefixTg.length;
      if (cursor < 0) {
        throw new Error(`could not find ${prefixTg}`);
      }

      const name = tgName.replace(/_+/g, "-");
      const nextParenthesis = captureInsideParenthesis(text, prefixTg) ??
        { match: "" };
      const config = nextParenthesis.match.replace(
        /=/g,
        ":",
      );
      const header = text.substring(0, text.lastIndexOf(prefixTg));

      return `${header}\ntypegraph({\nname: "${name}",\n${config}}, (g) => \n{${body}\n});`;
    },
  },
  {
    description: "Function name on an object: foo.some_func => foo.someFunc",
    apply(text: string) {
      return text
        .replace(
          /\.(\w+_)+?(\w+)/g,
          camelCase,
        );
    },
  },
  {
    description: "Expose expression",
    apply(text: string) {
      const exposed = captureInsideParenthesis(text, "g.expose") ??
        { match: "" };
      return text.replace(
        exposed.match,
        `{${exposed.match.replace(/=/g, ":")}}`,
      );
    },
  },
  {
    description: "Keyword translation",
    apply(text: string) {
      const replMap = Object.entries({
        "True": "true",
        "False": "false",
        "None": "null",
      });
      return replMap
        .reduce((prev, [tk, repl]) => prev.replaceAll(tk, repl), text);
    },
  },
  {
    description: "Scalar type argument translation",
    apply(text: string) {
      const objectify = (list: Array<[string, string]>) => {
        return `{${list.map(([k, v]) => `${k}: ${v}`).join(", ")}}`;
      };
      const prefix = /t\.(integer|float|string|boolean|uuid)/g;
      const cursors = findCursors(text, prefix)
        .map(({ start }) =>
          captureInsideParenthesis(text, prefix, start) ?? { match: "" }
        );

      return cursors.reduce((prev, { match }) => {
        if (match == "") return prev;
        const basic = ["min", "max", "xmin", "xmax"];
        const splits = match.split(",")
          .map((arg) => arg.split("="));
        const left = [] as Array<[string, string]>;
        const right = [] as Array<[string, string]>;
        for (const [k, v] of splits) {
          const ptr = basic.includes(k) ? left : right;
          ptr.push([camelCase(k.trim()), v]);
        }
        return prev.replace(
          match,
          `${objectify(left)}, ${objectify(right)}`,
        );
      }, text);
    },
  },
  {
    description: "Comment name=..",
    apply(text: string) {
      // struc({}, name=..) => struct({}/*rename("..")*/)
      const prefix = "t.struct";
      return findCursors(text, prefix)
        .map(({ start }) => {
          const insideParenth = captureInsideParenthesis(text, prefix, start) ??
            { match: "" };
          return insideParenth.match.match(/,?\s*name\s*=\s*("\w+")/);
        }).reduce(
          (prev, rename) =>
            rename === null ? prev : ({
              value: prev.value.replace(
                rename[0],
                `/*rename(${rename[1].trim()})*/`,
              ),
            }),
          { value: text },
        ).value;
    },
  },
  // {
  //   description: "Variable assignements",
  //   apply(text: string) {
  //     // at this stage g.expose is already translated
  //     return text.split(/\n/g).map((line) => {
  //       // assignement test
  //       if (!/\s*\w+\s*=.+\s/.test(line)) {
  //         return line;
  //       }
  //       const [left, right] = line.split("=");
  //       if (right && !/config/.test(left)) {
  //         const indent = left.match(/\s*/)?.[0] ?? "";
  //         return `${indent}const ${left.trim()} = ${right.trim()}`;
  //       }
  //       return line;
  //     }).join("\n");
  //   },
  // },
  // {
  //   description: "Translate multiline comments",
  //   apply(text: string) {
  //     return text;
  //   },
  // },
  // {
  //   description: "Translate multiline string",
  //   apply(text: string) {
  //     return text;
  //   },
  // },
];

const path = resolve(args.file);
const source = Deno.readTextFileSync(path);

const result = chain
  .reduce((prev: StepResult, step: ReplaceStep) => {
    let { output, errors } = prev;
    try {
      output = step.apply(output);
    } catch (error) {
      errors = [...errors, {
        error,
        stepDescription: step.description,
      }];
    }
    return { output, errors };
  }, { output: source, errors: [] } as StepResult);

if (!args.force && result.errors.length > 0) {
  console.error(
    "Failed the following steps:\n",
    result
      .errors
      .map(({ stepDescription, error }) =>
        `- ${stepDescription}: "${
          typeof error == "string" ? error : error.message
        }"`
      )
      .join("\n"),
  );
  Deno.exit(-2);
}

if (args.print) {
  console.log(result.output);
} else {
  const outputFile = basename(path).replace(/\.py$/, ".ts");
  Deno.writeTextFileSync(join(dirname(path), outputFile), result.output);
}
