// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

/**
 * Translate typegraph in python to deno
 * Usage:
 *   deno run -A --config=typegate/deno.jsonc dev/tg-py2ts.ts --file <file.py> [--force]
 */

import { parseFlags, resolve } from "./deps.ts";

const args = parseFlags(Deno.args, {
  string: ["file"],
  boolean: ["force"],
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
          const relPath = pkg.split(".").join("/");
          const imports = imp.split(/\s*,\s*/)
            .map((e) => camelCase(e))
            .join(", ");
          return `import { ${imports} } from "@typegraph/sdk/${relPath}.js\n`;
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
      // TODO
      return text;
    },
  },
  {
    description: "Function names: some_func => someFunc",
    apply(text: string) {
      return text
        .replace(
          /(\w+_)+?(\w+)/g,
          camelCase,
        );
    },
  },
  {
    description: "Expose expression",
    apply(text: string) {
      // TODO
      return text;
    },
  },
  // {
  //   description: "Translate multiline comments",
  //   apply(text: string) {
  //     // TODO
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

console.log(result.output);

// TODO
// write .ts on the same directory as path
