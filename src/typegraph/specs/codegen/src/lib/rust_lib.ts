import * as path from "@std/path";
import { toPascalCase } from "@std/text";
import { TypeDefProcessor } from "./base.ts";
import type {
  AliasTypeDef,
  FuncDef,
  RecordTypeDef,
  UnionTypeDef,
  TypeDefSource,
} from "./base.ts";

const typeMap = {
  UInt: "u32",
  SInt: "i32",
  Float: "f64",
  string: "String",
  boolean: "bool",
  void: "()",
};

class RustLibCodeGenerator extends TypeDefProcessor {
  constructor() {
    super({
      typeMap,
      fileExtension: ".rs",
    });
  }

  override makeArrayType(inner: string) {
    return `Vec<${inner}>`;
  }

  override makeTupleType(first: string, second: string) {
    return `(${first}, ${second})`;
  }

  override formatHeaders(_moduleName?: string) {
    const baseImport = "use serde::{Serialize, Deserialize};";

    const imports = this.imports.map(
      ({ imports, source }) =>
        `use super::${source}::${imports.length > 1 ? `{${imports.join(", ")}}` : imports};`,
    );

    return [baseImport, ...imports].filter(Boolean).join("\n");
  }

  override formatAliasTypeDef(def: AliasTypeDef) {
    return `pub type ${def.ident} = ${def.value};`;
  }

  override formatRecordTypeDef(def: RecordTypeDef) {
    const props = def.props
      .map(
        (p) =>
          `    pub ${p.name}: ${p.optional ? `Option<${p.value}>` : p.value},`,
      )
      .join("\n");

    return `#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ${def.ident} {
${props}
}`;
  }

  override formatUnionTypeDef(def: UnionTypeDef) {
    const variants = def.variants
      .map(
        (v) =>
          `    ${v.value ? `${toPascalCase(v.tag)}(${v.value})` : toPascalCase(v.tag)},`,
      )
      .join("\n");

    return `#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ${def.ident} {
${variants}
}`;
  }

  override formatFuncDef(def: FuncDef): string {
    const params = def.params
      .map((p) => `${p.name}: ${p.optional ? `Option<${p.type}>` : p.type}`)
      .join(", ");

    return `fn ${def.ident}(${params}) -> Result<${def.ret}, super::Error>;`;
  }

  override formatFuncDefs() {
    return `pub trait Handler {
${this.funcDefs.map((f) => `    ${this.formatFuncDef(f)}`).join("\n")}
}`;
  }

  override postGenerate(sources: TypeDefSource[], outDir: string) {
    const imports = sources
      .map(({ moduleName }) => `pub mod ${moduleName};`)
      .concat("pub use core::Error;")
      .join("\n");

    Deno.writeTextFileSync(path.join(outDir, "mod.rs"), imports);

    console.log("mod.rs was created");
  }
}

export default RustLibCodeGenerator;
