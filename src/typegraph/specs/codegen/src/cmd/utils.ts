import * as path from "@std/path";
import TypeScriptCodeGenerator from "../lib/typescript.ts";
import RustLibCodeGenerator from "../lib/rust_lib.ts";
import PythonCodeGenerator from "../lib/python.ts";
import RustRpcCodeGenerator from "../lib/rust_rpc.ts";

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

function getCodeGenerator(target: string) {
  if (target === "typescript") return new TypeScriptCodeGenerator();
  if (target === "python") return new PythonCodeGenerator();
  if (target === "rust-lib") return new RustLibCodeGenerator();
  if (target === "rust-rpc") return new RustRpcCodeGenerator();
}

export { getTypeDefSources, getCodeGenerator };
