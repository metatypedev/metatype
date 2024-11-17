// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as path from "@std/path";
import { toPascalCase } from "@std/text";
import type { FuncDef, TypeDefSource } from "./base.ts";
import RustLibCodeGenerator from "./rust_lib.ts";

class RustRpcCodeGenerator extends RustLibCodeGenerator {
  constructor() {
    super();
  }

  override formatHeaders(moduleName: string) {
    const baseImports = [
      "use serde::{Serialize, Deserialize};",
      "use serde_json::Value;",
      "use typegraph_core::{errors::Result, Lib};",
      `use typegraph_core::sdk::${moduleName}::*;`,
    ];

    const imports = this.imports.map(
      ({ imports, source }) =>
        "#[allow(unused)]\n" +
        `use typegraph_core::sdk::${source}::${imports.length > 1 ? `{${imports.join(", ")}}` : imports};`,
    );

    return baseImports.concat(imports).join("\n");
  }

  formatEnumVariantDef(def: FuncDef) {
    const data = def.params.length
      ? ` { ${def.params.map((p) => `${p.name}: ${p.optional ? `Option<${p.type}>` : p.type}`).join(", ")} }`
      : "";

    return `${toPascalCase(def.ident)}${data}`;
  }

  formatEnumVariantBranching(def: FuncDef) {
    const data = def.params.length
      ? ` { ${def.params.map((p) => p.name).join(", ")} }`
      : "";

    const handler =
      `Lib::${def.ident}(${def.params.map((p) => p.name).join(", ")})` +
      ".map(|res| serde_json::to_value(res).unwrap())";

    return `${toPascalCase(def.ident)}${data} => ${handler}`;
  }

  formatRpcEnumDef() {
    return `#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "method", content = "params", rename_all="snake_case")]
pub enum RpcCall {
${this.funcDefs.map((def) => `    ${this.formatEnumVariantDef(def)},`).join("\n")}
}`;
  }

  formatRpcEnumImpl() {
    return `impl super::RpcDispatch for RpcCall {
    fn dispatch(self) -> Result<Value> {
        match self {
${this.funcDefs.map((def) => `            Self::${this.formatEnumVariantBranching(def)},`).join("\n")}
        }
    }
}`;
  }

  override formatFile(moduleName: string) {
    return [
      this.formatHeaders(moduleName),
      this.formatRpcEnumDef(),
      this.formatRpcEnumImpl(),
    ].join("\n\n");
  }

  override postGenerate(sources: TypeDefSource[], outDir: string) {
    const exports = sources
      .map(({ moduleName }) => `pub mod ${moduleName};`)
      .join("\n");

    const dependencies = [
      "use enum_dispatch::enum_dispatch;",
      "use serde::{Serialize, Deserialize};",
      "use serde_json::Value;",
      "use typegraph_core::errors::Result;",
    ].join("\n");

    const traitDef = `#[enum_dispatch]
pub trait RpcDispatch {
    fn dispatch(self) -> Result<Value>;
}`;

    const rpcDef = `#[derive(Debug, Serialize, Deserialize)]
#[enum_dispatch(RpcDispatch)]
#[serde(untagged)]
pub enum RpcCall {
${sources.map(({ moduleName }) => `    ${toPascalCase(moduleName)}(${moduleName}::RpcCall),`).join("\n")}
}`;

    const fileContent = [exports, dependencies, traitDef, rpcDef].join("\n\n");

    Deno.writeTextFileSync(path.join(outDir, "mod.rs"), fileContent);

    const cmd = new Deno.Command("cargo", {
      cwd: outDir,
      args: ["fmt", "-p", "meta-cli"],
    });

    cmd.outputSync();

    console.log("mod.rs was created");
  }
}

export default RustRpcCodeGenerator;
