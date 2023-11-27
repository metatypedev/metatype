import { assertEquals } from "std/assert/mod.ts";
import { join } from "std/path/mod.ts";
import { testDir } from "./utils.ts";
import Parser from "tree-sitter";

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

  console.log(tree.rootNode.toString());
});
