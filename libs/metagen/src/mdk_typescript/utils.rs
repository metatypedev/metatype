// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use heck::*;
use once_cell::sync::Lazy;

// sourced from
// https://github.com/microsoft/TypeScript/blob/ef514af2675389d38c793d6cc1945486c367e6fa/src/compiler/types.ts#L140
static KEYWORDS: Lazy<std::collections::HashSet<&'static str>> = Lazy::new(|| {
    [
        "break",
        "case",
        "catch",
        "class",
        "const",
        "continue",
        "debugger",
        "default",
        "delete",
        "do",
        "else",
        "enum",
        "export",
        "extends",
        "false",
        "finally",
        "for",
        "function",
        "if",
        "import",
        "in",
        "instanceof",
        "new",
        "null",
        "return",
        "super",
        "switch",
        "this",
        "throw",
        "true",
        "try",
        "typeof",
        "var",
        "void",
        "while",
        "with",
        // strict mode reserved words
        "implements",
        "interface",
        "let",
        "package",
        "private",
        "protected",
        "public",
        "static",
        "yield",
        // contextual keywords
        "abstract",
        "accessor",
        "as",
        "asserts",
        "assert",
        "any",
        "async",
        "await",
        "boolean",
        "constructor",
        "declare",
        "get",
        "infer",
        "intrinsic",
        "is",
        "keyof",
        "module",
        "namespace",
        "never",
        "out",
        "readonly",
        "require",
        "number",
        "object",
        "satisfies",
        "set",
        "string",
        "symbol",
        "type",
        "undefined",
        "unique",
        "unknown",
        "using",
        "from",
        "global",
        "bigint",
        "override",
        "of",
    ]
    .into_iter()
    .collect()
});

pub fn normalize_type_title(title: &str) -> String {
    static RE: Lazy<regex::Regex> =
        Lazy::new(|| regex::Regex::new(r"^(?<startd>\d+)(?<rest>.*)").unwrap());

    // TODO: clean up non valid chars

    // clean out underscores at start/end
    let title = title.trim_matches('_');
    // move any numbers at start to end
    let title = title.to_pascal_case();
    let title = RE.replace(&title, "$rest$startd");
    title.to_string()
}

/// This assumes title was already through [normalize_type_title]
pub fn normalize_struct_prop_name(title: &str) -> String {
    if KEYWORDS.contains(title) {
        format!("\"{title}\"")
    } else {
        title.to_string()
    }
}
