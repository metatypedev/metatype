import { assertEquals } from "std/assert/mod.ts";
import { join } from "std/path/mod.ts";
import { testDir } from "./utils.ts";
import Parser from "npm:web-tree-sitter";
import {
  findTypegraphDefinitions,
  TypegraphDefinition,
} from "../src/parser.ts";

await Parser.init();
const TypeScript = await Parser.Language.load(
  join(testDir, "../grammars/typescript.wasm"),
);

Deno.test("apply", async (t) => {
  const codeBuf = await Deno.readFile(
    join(testDir, "typegraphs/apply_deno.ts"),
  );
  const code = new TextDecoder().decode(codeBuf);

  const parser = new Parser();
  parser.setLanguage(TypeScript);

  const tree = parser.parse(code);
  const node = tree.rootNode;
  const typegraphDefs = findTypegraphDefinitions(node);
  for (const def of typegraphDefs) {
    console.log();
    console.log(new TypegraphDefinition(def));
  }
});
