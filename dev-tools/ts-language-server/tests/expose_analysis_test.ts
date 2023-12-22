import { assertEquals, assertObjectMatch } from "std/assert/mod.ts";
import { join } from "std/path/mod.ts";
import { testDir } from "./utils.ts";
import Parser from "npm:web-tree-sitter";
import {
  findTypegraphDefinitions,
  TypegraphDefinition,
} from "../src/parser.ts";
import { analyzeExposeExpression } from "../src/analysis/exposed_function.ts";
import { ScopeManager } from "../src/analysis/typescript-semantic/scope.ts";
import { ModuleDiagnosticsContext } from "../src/analysis/diagnostics/context.ts";
import { assertSnapshot } from "std/testing/snapshot.ts";

await Parser.init();
const TypeScript = await Parser.Language.load(
  join(testDir, "../grammars/typescript.wasm"),
);

Deno.test("semantic analysis of expose", async (t) => {
  const fileUri = new URL("typegraphs/deno_types.ts", import.meta.url);
  const codeBuf = await Deno.readFile(fileUri);
  const code = new TextDecoder().decode(codeBuf);

  const parser = new Parser();
  parser.setLanguage(TypeScript);

  const tree = parser.parse(code);
  const node = tree.rootNode;
  const ctx = new ModuleDiagnosticsContext(node, fileUri.toString());

  const typegraphDefs = findTypegraphDefinitions(node);
  assertEquals(typegraphDefs.length, 1);

  ctx.checkTypegraph(typegraphDefs[0]);

  await assertSnapshot(t, ctx.diagnostics);
});
