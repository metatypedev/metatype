// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use heck::*;
use once_cell::sync::Lazy;

static KEYWORDS: Lazy<std::collections::HashSet<&'static str>> = Lazy::new(|| {
    [
        // strict keywords
        "as", "break", "const", "continue", "crate", "else", "enum", "extern", "false", "fn", "for",
        "if", "impl", "in", "let", "loop", "match", "mod", "move", "mut", "pub", "ref", "return",
        "self", "Self", "static", "struct", "super", "trait", "true", "type", "unsafe", "use",
        "where", "while", //
        // 2018+ keywords
        "async", "await", "dyn", //
        // reserved keywords
        "abstract", "become", "box", "do", "final", "macro", "override", "priv", "typeof",
        "unsized", "virtual", "yield", //
        // 2018+ reserved keywords
        "try",
    ]
    .into_iter()
    .collect()
});

pub fn normalize_type_title(title: &str) -> String {
    static RE: Lazy<regex::Regex> =
        Lazy::new(|| regex::Regex::new(r"^(?<startd>\d+)(?<rest>.*)").unwrap());

    // TODO: clean out rust keywords
    // TODO: clean up non valid chars

    // clean out underscores at start/end
    let title = title.trim_matches('_');
    // move any numbers at start to end
    let title = title.to_pascal_case();
    let title = RE.replace(&title, "$rest$startd");
    if KEYWORDS.contains(&title[..]) {
        format!("r#{title}")
    } else {
        title.to_string()
    }
}

pub fn normalize_struct_prop_name(title: &str) -> String {
    let title = title.to_snek_case();
    if KEYWORDS.contains(&title[..]) {
        format!("r#{title}")
    } else {
        title
    }
}
