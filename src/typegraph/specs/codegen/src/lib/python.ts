import * as fs from "@std/fs";
import * as path from "@std/path";
import { TypeDefProcessor } from "./base.ts";
import type {
  AliasTypeDef,
  FuncDef,
  RecordTypeDef,
  TypeDefSource,
  UnionTypeDef,
} from "./base.ts";
import { toPascalCase } from "@std/text";

const typeMap = {
  UInt: "int",
  SInt: "int",
  Float: "float",
  string: "str",
  boolean: "bool",
  void: "None",
};

class PythonCodeGenerator extends TypeDefProcessor {
  constructor() {
    super({
      typeMap,
      reservedKeywords: [],
      fileExtension: ".py",
    });
  }

  override makeArrayType(inner: string) {
    return `t.List[${inner}]`;
  }

  override makeTupleType(first: string, second: string) {
    return `t.Tuple[${first}, ${second}]`;
  }

  override formatHeaders() {
    return [
      "import typing as t",
      "from pydantic import BaseModel",
      "from client import rpc_request",
      this.imports
        .map(
          ({ source, imports }) =>
            `from ${source} import ${imports.join(", ")}`,
        )
        .join("\n"),
    ].join("\n");
  }

  override formatAliasTypeDef(def: AliasTypeDef) {
    return `${def.ident} = ${def.value}`;
  }

  override formatRecordTypeDef(def: RecordTypeDef) {
    const props = def.props
      .map(
        (p) =>
          `    ${p.name}: ${p.optional ? `t.Optional[${p.value}]` : p.value}`,
      )
      .join("\n");

    return `class ${def.ident}(BaseModel):
${props}`;
  }

  override formatUnionTypeDef(def: UnionTypeDef) {
    const variants = def.variants
      .map(
        ({ tag, value }) =>
          `    ${value ? `t.TypedDict("${def.ident}${toPascalCase(tag)}", {"${tag}": ${value}})` : `t.Literal["${tag}"]`},`,
      )
      .join("\n");

    return `${def.ident} = t.Union[
${variants}
]`;
  }

  override formatFuncDef(def: FuncDef): string {
    if (!def.params.length) {
      return `def ${def.ident}() -> ${def.ret}:
    class ReturnType(BaseModel):
        value: ${def.ret}

    res = rpc_request("${def.ident}")
    ret = ReturnType(**res)

    return ret.value`;
    }

    const params = def.params
      .map(
        (p) =>
          `${p.name}: ${p.optional ? `t.Optional[${p.type}] = None` : p.type}`,
      )
      .join(", ");

    return `def ${def.ident}(${params}) -> ${def.ret}:
    class RequestType(BaseModel):
${def.params.map((p) => `        ${p.name}: ${p.optional ? `t.Optional[${p.type}]` : p.type}`).join("\n")}

    class ReturnType(BaseModel):
        value: ${def.ret}

    req = RequestType(${def.params.map(({ name }) => `${name}=${name}`).join(", ")})
    res = rpc_request("${def.ident}", req.model_dump())
    ret = ReturnType(**res)

    return ret.value`;
  }

  override postGenerate(_sources: TypeDefSource[], outDir: string): void {
    const dirname = new URL(".", import.meta.url).pathname;
    const rpcClientFile = path.join(dirname, "../../rpc/python/client.py");

    fs.copySync(rpcClientFile, path.join(outDir, "client.py"), {
      overwrite: true,
    });

    Deno.createSync(path.join(outDir, "__init__.py"));

    console.log("client.py was created");
    console.log("__init__.py was created");
  }
}

export default PythonCodeGenerator;
