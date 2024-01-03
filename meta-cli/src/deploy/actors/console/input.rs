// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::borrow::Cow;

use actix::Addr;
use anyhow::{bail, Result};
use colored::Colorize;

use crate::deploy::actors::console::{Console, ConsoleActor};

pub trait ConfirmHandler: std::fmt::Debug {
    fn on_confirm(&self);
    fn on_deny(&self) {}
}

pub struct OptionLabel<'a> {
    primary: Cow<'a, str>,
    secondary: Option<Cow<'a, str>>,
}

impl<'a> OptionLabel<'a> {
    pub fn new(primary: impl Into<Cow<'a, str>>) -> Self {
        Self {
            primary: primary.into(),
            secondary: None,
        }
    }

    pub fn with_secondary(mut self, secondary: impl Into<Cow<'a, str>>) -> Self {
        self.secondary = Some(secondary.into());
        self
    }
}

pub trait SelectOption: std::fmt::Debug {
    fn on_select(&self);
    fn label(&self) -> OptionLabel<'_>;
}

pub struct Select {
    console: Addr<ConsoleActor>,
    prompt: String,
    max_retry_count: usize,
}

impl Select {
    pub fn new(console: Addr<ConsoleActor>, prompt: String) -> Self {
        Self {
            console,
            prompt,
            max_retry_count: 0,
        }
    }

    pub fn max_retry_count(mut self, max_retry_count: usize) -> Self {
        self.max_retry_count = max_retry_count;
        self
    }

    pub async fn interact(
        self,
        options: &[Box<dyn SelectOption + Sync + Send + 'static>],
    ) -> Result<usize> {
        let mut retry_left = self.max_retry_count;

        eprintln!("{} {}", "[select]".yellow(), self.prompt);
        for (i, option) in options.iter().enumerate() {
            let label = option.label();
            eprintln!("{}) {}", i + 1, label.primary);
            if let Some(secondary_label) = label.secondary {
                eprintln!("   {}", secondary_label.dimmed());
            }
        }

        loop {
            eprint!("(1-{})> ", options.len());

            let input = self.console.read_line().await;

            match input.trim().parse::<usize>() {
                Ok(i) if i > 0 && i <= options.len() => {
                    options[i - 1].on_select();
                    return Ok(i - 1);
                }
                _ => {
                    log::error!("Invalid option, please try again.");
                }
            }

            retry_left -= 1;
            if retry_left == 0 {
                bail!("Max retry count exceeded");
            }
        }
    }
}

pub struct Confirm {
    console: Addr<ConsoleActor>,
    prompt: String,
    max_retry_count: usize,
}

impl Confirm {
    pub fn new(console: Addr<ConsoleActor>, prompt: String) -> Self {
        Self {
            console,
            prompt,
            max_retry_count: 0,
        }
    }

    pub fn max_retry_count(mut self, max_retry_count: usize) -> Self {
        self.max_retry_count = max_retry_count;
        self
    }

    pub async fn interact(
        self,
        handler: Box<dyn ConfirmHandler + Sync + Send + 'static>,
    ) -> Result<bool> {
        let mut retry_left = self.max_retry_count as isize;

        eprintln!("{} {}", "[confirm]".yellow(), self.prompt);

        loop {
            eprint!("(y/N)> ");

            let input = self.console.read_line().await;

            match input.trim().to_lowercase().as_str() {
                "y" | "yes" => {
                    handler.on_confirm();
                    return Ok(true);
                }
                "n" | "no" => {
                    handler.on_deny();
                    return Ok(false);
                }
                _ => {
                    log::error!("Invalid option, please try again.");
                }
            }

            retry_left -= 1;
            if retry_left < 0 {
                bail!("Max retry count exceeded");
            }
        }
    }
}
