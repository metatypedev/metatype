// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

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
