// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use heck::*;
use once_cell::sync::Lazy;

// sourced from
// keyword library https://docs.python.org/3/library/keyword.html
static _KEYWORDS: Lazy<std::collections::HashSet<&'static str>> = Lazy::new(|| {
    [
        "False", "None", "True", "and", "as", "assert", "async", "await", "break", "class",
        "continue", "def", "del", "elif", "else", "except", "finally", "for", "from", "global",
        "if", "import", "in", "is", "lambda", "nonlocal", "not", "or", "pass", "raise", "return",
        "try", "while", "with", "yield",
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
    title.to_snek_case()
    // if KEYWORDS.contains(&title[..]) {
    //     format!("{title}_")
    // } else {
    //     title
    // }
}
