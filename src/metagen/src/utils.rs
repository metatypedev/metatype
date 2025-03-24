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

/// Processes input text with metagen directives for conditional code generation.
///
/// Supported directives:
/// - `metagen-skip` - Skip the next line
/// - `metagen-genif <flag>` - Include following lines only if the flag is true
/// - `metagen-genif-not <flag>` - Include following lines only if the flag is false
/// - `metagen-endif` - End a conditional block
///
/// # Arguments
/// * `dest` - The destination buffer to write to
/// * `input` - The input text to process
/// * `flags` - Map of feature flags that control directive behavior
///
/// # Returns
/// * `Ok(())` if processing was successful
/// * `Err` if there are unmatched or unclosed directives
pub fn processed_write(
    dest: &mut impl Write,
    input: &str,
    flags: &BTreeMap<String, bool>,
) -> eyre::Result<()> {
    static SKIP: once_cell::sync::Lazy<regex::Regex> =
        once_cell::sync::Lazy::new(|| regex::Regex::new(r"metagen-skip").unwrap());
    static IF_START: once_cell::sync::Lazy<regex::Regex> = once_cell::sync::Lazy::new(|| {
        regex::Regex::new(r"metagen-genif(?<not>-not)?\s+(?<name>\S+)").unwrap()
    });
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
            let not = caps.name("not");
            let condition = flags.get(flag).copied().unwrap_or(false);
            let condition = condition ^ not.is_some();
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
                .map(|(line, _)| line.to_string())
                .collect::<Vec<_>>()
                .join(", ")
        )
    }

    Ok(())
}

/// Moves lines in the input string that match a pattern to come subsequent
/// to the first instance of a line that matches. Order will be preserved.
/// Useful to collect import statements to top of file.
pub fn collect_at_first_instance(input: &str, pattern: &regex::Regex) -> String {
    use std::collections::HashSet;

    let lines: Vec<&str> = input.lines().collect();
    let mut matches = lines.iter().enumerate().filter_map(|(ii, line)| {
        if pattern.is_match(line) {
            Some(ii)
        } else {
            None
        }
    });

    let Some(first) = matches.next() else {
        return input.to_string();
    };

    let mut matches_set: HashSet<usize> = [first].into_iter().collect();

    let mut output_lines = Vec::with_capacity(lines.len());

    // Add lines before first match
    output_lines.extend_from_slice(&lines[..first]);

    // Add first match
    output_lines.push(lines[first]);

    // Add subsequent matches in order
    for ii in matches {
        matches_set.insert(ii);
        output_lines.push(lines[ii]);
    }

    // Add non-matching lines after first match
    let post_non_matches = lines[first + 1..]
        .iter()
        .enumerate()
        .filter_map(|(rel_i, line)| {
            let original_i = first + 1 + rel_i;
            if matches_set.contains(&original_i) {
                None
            } else {
                Some(*line)
            }
        });

    output_lines.extend(post_non_matches);

    output_lines.join("\n")
}

#[allow(dead_code)]
pub fn indent_lines(s: &str, indent: &str) -> Result<String, core::fmt::Error> {
    let mut result = String::new();
    indent_lines_into(&mut result, s, indent)?;
    Ok(result)
}

pub fn indent_lines_into(
    out: &mut impl Write,
    source: &str,
    indent: &str,
) -> Result<(), core::fmt::Error> {
    for line in source.lines() {
        if !line.is_empty() {
            writeln!(out, "{}{}", indent, line)?;
        } else {
            writeln!(out)?;
        }
    }
    Ok(())
}
