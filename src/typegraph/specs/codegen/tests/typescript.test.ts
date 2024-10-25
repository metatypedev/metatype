import { assertEquals } from "jsr:@std/assert";
import TypeScriptCodeGenerator from "../src/lib/typescript.ts";
import * as utils from "./utils.ts";

Deno.test("TypeScript type alias codegen", () => {
  const tscg = new TypeScriptCodeGenerator();

  tscg.process(utils.typeAliasCase);

  const result = tscg.formatTypeDefs();
  const expected = "export type Foo = Bar;";

  assertEquals(result, expected);
});

Deno.test("TypeScript struct codegen", () => {
  const pycg = new TypeScriptCodeGenerator();

  pycg.process(utils.recordCase);

  const result = pycg.formatTypeDefs();
  const expected = `export type RecordLike = {
  num: number
  key: string
  str_arr: string[]
  tup: [number, number]
  opt?: boolean
  comp?: [number, Something][]
}`;

  assertEquals(result, expected);
});

Deno.test("TypeScript union codegen", () => {
  const tscg = new TypeScriptCodeGenerator();

  tscg.process(utils.unionCase);

  const result = tscg.formatTypeDefs();
  const expected = `export type EnumLike =
  | "simple"
  | { composite: Something }
  | { snake_case: boolean };`;

  assertEquals(result, expected);
});

Deno.test("TypeScript function codegen", () => {
  const tscg = new TypeScriptCodeGenerator();

  tscg.process(utils.funcCase);

  const result = tscg.formatFuncDefs();
  const expected = `export function func(param: string, opt?: boolean): number {
  return rpcRequest("func", { param, opt });
}`;

  assertEquals(result, expected);
});

Deno.test("TypeScript import codegen", () => {
  const tscg = new TypeScriptCodeGenerator();

  tscg.process(utils.importCase);

  const result = tscg.formatHeaders();
  const expected = `import { rpcRequest } from "./client.ts";
import { Foo, Bar } from "./foobar.ts";`;

  assertEquals(result, expected);
});
