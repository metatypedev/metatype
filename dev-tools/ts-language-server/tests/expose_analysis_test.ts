import { assertEquals, assertObjectMatch } from "std/assert/mod.ts";
import { join } from "std/path/mod.ts";
import { testDir } from "./utils.ts";
import Parser from "npm:web-tree-sitter";
import {
  findTypegraphDefinitions,
  TypegraphDefinition,
} from "../src/parser.ts";
import { analyzeExposeExpression } from "../src/analysis/exposed_function.ts";

await Parser.init();
const TypeScript = await Parser.Language.load(
  join(testDir, "../grammars/typescript.wasm"),
);

Deno.test("semantic analysis of expose", async (_t) => {
  const codeBuf = await Deno.readFile(
    join(testDir, "typegraphs/apply_deno.ts"),
  );
  const code = new TextDecoder().decode(codeBuf);

  const parser = new Parser();
  parser.setLanguage(TypeScript);

  const tree = parser.parse(code);
  const node = tree.rootNode;
  const typegraphDefs = findTypegraphDefinitions(node);
  assertEquals(typegraphDefs.length, 1);

  const typegraphDef = new TypegraphDefinition(typegraphDefs[0]);
  const exposed = typegraphDef.findExposedFunctions();
  const analysisResult = exposed.map(([name, node]) => {
    const res = analyzeExposeExpression(node);
    return {
      name,
      runtime: res.runtime.text,
      generator: res.generator,
    };
  });

  assertObjectMatch(analysisResult[0], {
    name: "add",
    runtime: "python",
    generator: "fromLambda",
  });
  assertObjectMatch(analysisResult[1], {
    name: "multiply",
    runtime: "deno",
    generator: "func",
  });
});
