// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use colored::Colorize;

pub fn print_box(content: &str, width: usize) {
    let wrap_width = width - 4;
    println!("┌{}┐", "—".repeat(width - 2));
    for line in textwrap::wrap(content.trim(), wrap_width) {
        println!("| {} {}|", line, " ".repeat(wrap_width - line.len()),);
    }
    println!("└{}┘", "—".repeat(width - 2));
}

pub fn title(title: &str, width: usize) {
    let pad = title.len() % 2;
    let side = (width - title.len() - pad) / 2;

    println!(
        "{} {}{} {}",
        "—".repeat(side),
        title.bold(),
        " ".repeat(pad),
        "—".repeat(side)
    );
}

pub fn cols<S: AsRef<str>>(size: usize, first: S, second: S) {
    println!(
        "{first:<size$} {second}",
        first = first.as_ref(),
        second = second.as_ref(),
        size = size,
    );
}
