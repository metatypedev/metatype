// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

/**
 * Translate typegraph in python to deno
 * This makes assumption at how a python typegraph looks like at 0.3.2
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

function upperFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.substring(1);
}

function camelCase(str: string) {
  return str
    .split(/_+/g)
    .map((chunk, idx) => idx > 0 ? upperFirst(chunk) : chunk)
    .join("");
}

function captureInsideParenthesis(text: string, prefix: string) {
  const cursor = text.lastIndexOf(prefix) + prefix.length;
  if (cursor < 0) "";
  let parenthStack = 0;
  let expr = "";
  for (let i = cursor; i < text.length; i++) {
    const char = text.charAt(i);
    if (char == "(" || char == ")") {
      parenthStack += char == "(" ? 1 : -1;
      if (parenthStack == 0) break; // first "(" has closed
      if (parenthStack < 0) {
        const peekRadius = 10;
        throw new Error(
          `invalid parenthesis near .. ${
            text.substring(
              Math.max(0, i - peekRadius),
              Math.min(text.length, i + peekRadius),
            ).replace(/[\n\r]/g, "\\n")
              .trim()
          } ..`,
        );
      }
    }
    if (i > cursor) {
      expr += char;
    }
  }
  return expr;
}

const chain: Array<ReplaceStep> = [
  {
    description: "imports",
    apply(text: string) {
      // TODO
      // replace all imports first
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
      const config = captureInsideParenthesis(text, prefixTg).replace(
        /=/g,
        ":",
      );
      const header = text.substring(0, text.lastIndexOf(prefixTg));

      return `${header}\ntypegraph({\nname: "${name}",\n${config}}, (g) => \n{${body}\n});`;
    },
  },
  {
    description: "Function names on an object: foo.some_func => foo.someFunc",
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
      const exposed = captureInsideParenthesis(text, "g.expose");
      return text.replace(exposed, `{${exposed.replace(/=/g, ":")}}`);
    },
  },
  {
    description: "Translate keywords",
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
  // {
  //   description: "variable assignements",
  //   apply(text: string) {
  //     return text;
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
