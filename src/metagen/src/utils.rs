// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;

use std::fmt::Write;

/// A generation destination analogous to a single file.
pub struct GenDestBuf {
    pub buf: String,
}

impl Write for GenDestBuf {
    #[inline]
    fn write_str(&mut self, s: &str) -> core::fmt::Result {
        <String as Write>::write_str(&mut self.buf, s)
    }

    #[inline]
    fn write_char(&mut self, c: char) -> core::fmt::Result {
        <String as Write>::write_char(&mut self.buf, c)
    }
}
// impl core::fmt::Write for GenDestBuf

/* /// A generation destination analogous to a directory.
pub struct GenDestFs {
    pub files: HashMap<String, GenDestBuf>,
} */

// Supports directives
pub fn processed_write(
    dest: &mut GenDestBuf,
    input: &str,
    flags: BTreeMap<String, bool>,
) -> eyre::Result<()> {
    static SKIP: once_cell::sync::Lazy<regex::Regex> =
        once_cell::sync::Lazy::new(|| regex::Regex::new(r"metagen-skip").unwrap());
    static IF_START: once_cell::sync::Lazy<regex::Regex> =
        once_cell::sync::Lazy::new(|| regex::Regex::new(r"metagen-genif (?<name>\S+)").unwrap());
    static IF_END: once_cell::sync::Lazy<regex::Regex> =
        once_cell::sync::Lazy::new(|| regex::Regex::new(r"metagen-endif").unwrap());

    let mut stack = Vec::new();

    let mut skip_next = false;
    for (ii, line) in input.lines().enumerate() {
        if SKIP.is_match(line) {
            skip_next = true;
            continue;
        }
        if skip_next {
            skip_next = false;
            continue;
        }
        if let Some(caps) = IF_START.captures(line) {
            // Extract flag name after "genif"
            let flag = &caps["name"];
            let condition = flags.get(flag).copied().unwrap_or(false);
            let (_, current_enabled) = stack.last().copied().unwrap_or((0, true));
            stack.push((ii, current_enabled && condition));
        } else if IF_END.is_match(line) {
            // Handle nested blocks and potential errors
            if stack.pop().is_none() {
                anyhow::bail!("unmatched endif directive at line {ii}");
            }
        } else {
            // Write line if enabled by current context
            let (_, enabled) = stack.last().copied().unwrap_or((0, true));
            if enabled {
                writeln!(dest, "{}", line)?;
            }
        }
    }
    if !stack.is_empty() {
        anyhow::bail!(
            "unclosed genif directives found at: {}",
            stack
                .into_iter()
                .map(|(line, _)| line)
                .fold(String::new(), |acc, cur| { format!("{acc}, {cur}") })
        )
    }

    Ok(())
}
