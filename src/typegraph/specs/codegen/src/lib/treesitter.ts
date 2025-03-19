// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import Parser, { type SyntaxNode } from "tree-sitter";
import TypeScript from "tree-sitter-typescript";

const parser = new Parser();
const language = TypeScript.typescript;

parser.setLanguage(language);

const typeDefQuery = new Parser.Query(
  language,
  `
  (type_alias_declaration
    name: (type_identifier) @ident
    value: (_) @value)
  `,
);

const importQuery = new Parser.Query(
  language,
  `
  (import_statement
    (import_clause
      (named_imports) @import)
    source: (string
      (string_fragment) @source)
  )
  `,
);

type TypeDefMatch = {
  ident: SyntaxNode;
  value: SyntaxNode;
};

type TypeImport = {
  imports: string[];
  source: string;
};

function parseTypeScript(source: string) {
  return parser.parse(source);
}

function getTypeDefs(root: SyntaxNode) {
  return typeDefQuery
    .matches(root)
    .map(({ captures }) =>
      Object.fromEntries(captures.map(({ name, node }) => [name, node])),
    ) as TypeDefMatch[];
}

function getImports(root: SyntaxNode) {
  return importQuery.matches(root).map(({ captures }) => {
    const [imports, source] = captures;
    const namedImports = imports.node.namedChildren.map(
      (c) => c.descendantsOfType("identifier")[0].text,
    );
    const sourceName = source.node.text.match(/\w+/)!;
    return { imports: namedImports, source: sourceName[0] };
  });
}

export type { TypeDefMatch, TypeImport };
export { getTypeDefs, getImports, parseTypeScript };
