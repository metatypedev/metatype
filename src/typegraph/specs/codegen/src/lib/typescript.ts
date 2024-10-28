import * as fs from "@std/fs";
import * as path from "@std/path";
import { toCamelCase } from "@std/text";
import { TypeDefProcessor } from "./base.ts";
import type {
  AliasTypeDef,
  FuncDef,
  RecordTypeDef,
  TypeDefSource,
  UnionTypeDef,
} from "./base.ts";

const typeMap = {
  UInt: "number",
  SInt: "number",
  Float: "number",
};

class TypeScriptCodeGenerator extends TypeDefProcessor {
  constructor() {
    super({
      typeMap,
      fileExtension: ".ts",
    });
  }

  override makeArrayType(inner: string) {
    return `${inner}[]`;
  }

  override makeTupleType(first: string, second: string) {
    return `[${first}, ${second}]`;
  }

  override formatHeaders(): string {
    const baseImport = 'import { rpcRequest } from "./client.ts";';

    const imports = this.imports.map(
      ({ source, imports }) =>
        `import type { ${imports.join(", ")} } from "./${source}.ts";`,
    );

    return [baseImport, ...imports].filter(Boolean).join("\n");
  }

  override formatAliasTypeDef(def: AliasTypeDef): string {
    return `export type ${def.ident} = ${def.value};`;
  }

  override formatRecordTypeDef(def: RecordTypeDef): string {
    return `export type ${def.ident} = {
${def.props
  .map((p) => `  ${p.name}${p.optional ? "?" : ""}: ${p.value}`)
  .join("\n")}
}`;
  }

  override formatUnionTypeDef(def: UnionTypeDef): string {
    return `export type ${def.ident} =
${def.variants.map((v) => `  | ${v.value ? `{ ${v.tag}: ${v.value} }` : `"${v.tag}"`}`).join("\n")};`;
  }

  override formatFuncDef(def: FuncDef) {
    const params = def.params
      .map((p) => `${p.name}${p.optional ? "?" : ""}: ${p.type}`)
      .join(", ");
    const args = def.params.length
      ? `{ ${def.params.map(({ name }) => name).join(", ")} }`
      : "null";

    return `export function ${toCamelCase(def.ident)}(${params}): ${def.ret} {
  return rpcRequest("${def.ident}", ${args});
}`;
  }

  override postGenerate(_sources: TypeDefSource[], outDir: string): void {
    const dirname = new URL(".", import.meta.url).pathname;
    const rpcClientFile = path.join(dirname, "../../rpc/typescript/client.ts");

    fs.copySync(rpcClientFile, path.join(outDir, "client.ts"), {
      overwrite: true,
    });

    console.log("client.ts was created");
  }
}

export default TypeScriptCodeGenerator;
