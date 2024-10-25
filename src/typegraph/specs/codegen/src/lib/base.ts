import type { SyntaxNode } from "tree-sitter";
import {
  getImports,
  getTypeDefs,
  parseTypeScript,
  type TypeDefMatch,
  type TypeImport,
} from "./treesitter.ts";
import * as path from "@std/path";

type TypeDef = AliasTypeDef | RecordTypeDef | UnionTypeDef;

type AliasTypeDef = {
  kind: "alias";
  ident: string;
  value: string;
};

type RecordTypeDef = {
  kind: "record";
  ident: string;
  props: { name: string; value: string; optional: boolean }[];
};

type UnionTypeDef = {
  kind: "union";
  ident: string;
  variants: { tag: string; value?: string }[];
};

type FuncDef = {
  ident: string;
  params: { name: string; type: string; optional: boolean }[];
  ret: string;
};

type TypeDefSource = {
  moduleName: string;
  content: string;
};

abstract class TypeDefProcessor {
  protected typeDefs: TypeDef[];
  protected funcDefs: FuncDef[];
  protected imports: TypeImport[];
  protected typeMap: Record<string, string | undefined>;
  protected reservedKeywords: string[];
  protected fileExtension: string;

  constructor(params: {
    typeMap: Record<string, string | undefined>;
    reservedKeywords: string[];
    fileExtension: string;
  }) {
    this.typeDefs = [];
    this.funcDefs = [];
    this.imports = [];
    this.typeMap = params.typeMap;
    this.reservedKeywords = params.reservedKeywords;
    this.fileExtension = params.fileExtension;
  }

  process(source: string) {
    const tree = parseTypeScript(source);
    const typeDefs = getTypeDefs(tree.rootNode);

    this.typeDefs = [];
    this.funcDefs = [];
    this.imports = getImports(tree.rootNode).filter(
      ({ source }) => source !== "primitives",
    );

    for (const typeDef of typeDefs) {
      this.visitTypeDef(typeDef);
    }
  }

  visitTypeDef(def: TypeDefMatch) {
    const { ident, value } = def;
    const valueType = value.type;

    if (valueType === "type_identifier" || valueType == "predefined_type")
      this.visitAliasType(ident, value);
    else if (valueType === "object_type") this.visitRecordType(ident, value);
    else if (valueType === "union_type") this.visitUnionType(ident, value);
    else if (valueType === "function_type")
      this.visitFunctionType(ident, value);
  }

  visitAliasType(ident: SyntaxNode, value: SyntaxNode) {
    this.typeDefs.push({
      kind: "alias",
      ident: ident.text,
      value: this.resolveType(value),
    });
  }

  visitRecordType(ident: SyntaxNode, value: SyntaxNode) {
    this.typeDefs.push({
      kind: "record",
      ident: ident.text,
      props: this.resolveRecordProps(value.namedChildren),
    });
  }

  visitUnionType(ident: SyntaxNode, value: SyntaxNode) {
    this.typeDefs.push({
      kind: "union",
      ident: ident.text,
      variants: this.resolveVariants(value),
    });
  }

  visitFunctionType(ident: SyntaxNode, value: SyntaxNode) {
    const params = value.childForFieldName("parameters")!;
    const ret = value.childForFieldName("return_type")!;
    const paramData = params.namedChildren.map((p) => {
      const [ident, second] = p.namedChildren;
      return {
        name: ident.text,
        type: this.resolveType(second.namedChildren[0]),
        optional: p.type === "optional_parameter",
      };
    });

    this.funcDefs.push({
      ident: ident.text,
      params: paramData,
      ret: this.resolveType(ret),
    });
  }

  abstract makeArrayType(inner: string): string;
  abstract makeTupleType(first: string, second: string): string;

  resolveIdent(ident: string) {
    return this.reservedKeywords.includes(ident) ? ident + "_" : ident;
  }

  resolveType(value: SyntaxNode): string {
    const [first, second] = value.namedChildren;

    if (value.type === "array_type") {
      return this.makeArrayType(this.resolveType(first));
    }

    if (value.type === "tuple_type") {
      return this.makeTupleType(
        this.resolveType(first),
        this.resolveType(second),
      );
    }

    return this.typeMap[value.text] ?? value.text;
  }

  resolveRecordProps(props: SyntaxNode[]) {
    const results = [];

    for (const prop of props) {
      if (!prop.childCount) continue; // skip possible comments

      const optional = prop.childCount === 3; // includes the `?` symbol
      const [identNode, valueNode] = prop.namedChildren;
      const name = this.resolveIdent(identNode.text);
      const value = this.resolveType(valueNode.namedChildren[0]);

      results.push({ name, value, optional });
    }

    return results;
  }

  resolveVariants(root: SyntaxNode) {
    const results = [];
    let current = root;

    while (current && current.type === "union_type") {
      const [first, ...rest] = current.namedChildren;
      const second = rest.filter((n) => n.type !== "comment").at(0); // escape comment nodes
      if (second) results.push(second);
      if (first) current = first;
    }

    if (current) {
      results.push(current);
    }

    return results.reverse().map((v) => this.resolveVariant(v));
  }

  resolveVariant(node: SyntaxNode) {
    if (node.type === "literal_type") {
      const nameNode = node.descendantsOfType("string_fragment")[0];
      return { tag: nameNode.text };
    }

    if (node.type === "object_type") {
      const nameNode = node.descendantsOfType("property_identifier")[0];
      const typeNode = node.descendantsOfType("type_annotation")[0];
      const type = this.resolveType(typeNode.namedChildren[0]);
      return { tag: nameNode.text, value: type };
    }

    throw new Error(`Unexpected variant node: ${node.text}`);
  }

  abstract formatAliasTypeDef(def: AliasTypeDef): string;
  abstract formatRecordTypeDef(def: RecordTypeDef): string;
  abstract formatUnionTypeDef(def: UnionTypeDef): string;
  abstract formatFuncDef(def: FuncDef): string;
  abstract formatHeaders(): string;

  formatTypeDef(def: TypeDef) {
    if (def.kind === "alias") return this.formatAliasTypeDef(def);
    else if (def.kind === "record") return this.formatRecordTypeDef(def);
    else return this.formatUnionTypeDef(def);
  }

  formatTypeDefs() {
    return this.typeDefs.map((def) => this.formatTypeDef(def)).join("\n\n");
  }

  formatFuncDefs() {
    return this.funcDefs.map((func) => this.formatFuncDef(func)).join("\n\n");
  }

  generate(sources: TypeDefSource[], outDir: string) {
    for (const { moduleName, content } of sources) {
      this.process(content);

      const filePath = path.join(outDir, moduleName + this.fileExtension);
      const fileContent = `${this.formatHeaders()}\n\n${this.formatTypeDefs()}\n\n${this.formatFuncDefs()}`;

      Deno.writeTextFileSync(filePath, fileContent);

      console.log(moduleName + this.fileExtension + " was created");
    }

    this.postGenerate(sources, outDir);
  }

  abstract postGenerate(sources: TypeDefSource[], outDir: string): void;
}

export type {
  TypeDef,
  AliasTypeDef,
  RecordTypeDef,
  UnionTypeDef,
  FuncDef,
  TypeDefSource,
};
export { TypeDefProcessor };
