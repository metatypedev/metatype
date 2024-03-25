import { typescript } from "tree-sitter-typescript";
import {
  findTypegraphDefinitions,
  TypegraphDefinition,
} from "../src/parser.ts";
import { analyzeExposeExpression } from "../src/analysis/exposed_function.ts";
import { ScopeManager } from "../src/analysis/typescript-semantic/scope.ts";
import { ModuleDiagnosticsContext } from "../src/analysis/diagnostics/context.ts";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const Parser = require("tree-sitter");

test("semantic analysis of expose", async (t) => {
  const fileUri = new URL("typegraphs/deno_types.ts", import.meta.url);
  // const filePath = resolve(__dirname, "typegraphs/deno_types.ts");
  const code = await readFile(fileUri, { encoding: "utf8" });

  const parser = new Parser();
  parser.setLanguage(typescript);

  const tree = parser.parse(code);
  const node = tree.rootNode;
  const ctx = new ModuleDiagnosticsContext(node, fileUri.toString());

  const typegraphDefs = findTypegraphDefinitions(node);
  // assertEquals(typegraphDefs.length, 1);

  // ctx.checkTypegraph(typegraphDefs[0]);

  // await assertSnapshot(t, ctx.diagnostics);
});
