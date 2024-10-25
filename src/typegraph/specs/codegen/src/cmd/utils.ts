import * as path from "@std/path";
import type { TypeDefProcessor } from "../lib/base.ts";
import TypeScriptCodeGenerator from "../lib/typescript.ts";
import RustLibCodeGenerator from "../lib/rust_lib.ts";
import PythonCodeGenerator from "../lib/python.ts";

const dirname = new URL(".", import.meta.url).pathname;

function getTypeDefSources() {
  const typeDefsDir = path.join(dirname, "../../../types");
  const typeDefFiles = Array.from(Deno.readDirSync(typeDefsDir));

  const typeDefModules = typeDefFiles
    .map(({ name }) => {
      const filePath = path.join(typeDefsDir, name);
      const fileContent = Deno.readTextFileSync(filePath);
      const moduleName = name.split(".")[0];
      return { moduleName, content: fileContent };
    })
    .filter(({ moduleName }) => moduleName !== "primitives");

  return typeDefModules;
}

type GenTarget = "typescript" | "python" | "rust-lib";

const validTargets = ["typescript", "python", "rust-lib"];

function getCodeGenerator(target: GenTarget): TypeDefProcessor {
  if (target === "typescript") return new TypeScriptCodeGenerator();
  if (target === "python") return new PythonCodeGenerator();
  return new RustLibCodeGenerator();
}

function isValidTarget(target: string): target is GenTarget {
  return validTargets.includes(target);
}

export type { GenTarget };
export { getTypeDefSources, getCodeGenerator, isValidTarget, validTargets };
