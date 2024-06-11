// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
use crate::interlude::*;

use std::borrow::Cow;

use actix::Addr;
use owo_colors::OwoColorize;

use crate::deploy::actors::console::{Console, ConsoleActor};

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

pub trait SelectOption<Value>: std::fmt::Debug {
    fn get_value(&self) -> Value;
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

    pub async fn interact<V>(
        self,
        options: &[Box<dyn SelectOption<V> + Sync + Send + 'static>],
    ) -> Result<(usize, V)> {
        let mut retry_left = self.max_retry_count;

        self.console
            .error(format!("{} {}", "[select]".yellow(), self.prompt));
        for (i, option) in options.iter().enumerate() {
            let label = option.label();
            self.console.error(format!("{}) {}", i + 1, label.primary));
            if let Some(secondary_label) = label.secondary {
                self.console
                    .error(format!("   {}", secondary_label.dimmed()));
            }
        }

        loop {
            self.console.error(format!("(1-{})> ", options.len()));

            let input = self.console.read_line().await;

            match input.trim().parse::<usize>() {
                Ok(i) if i > 0 && i <= options.len() => {
                    let value = options[i - 1].get_value();
                    return Ok((i - 1, value));
                }
                _ => {
                    log::error!("invalid option, please try again");
                }
            }

            retry_left -= 1;
            if retry_left == 0 {
                bail!("max retry count exceeded");
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

    pub async fn interact(self) -> Result<bool> {
        let mut retry_left = self.max_retry_count as isize;

        loop {
            self.console
                .error(format!("{} {} (y/N)", "[confirm]".yellow(), self.prompt));

            let input = self.console.read_line().await;

            match input.trim().to_lowercase().as_str() {
                "y" | "yes" => {
                    return Ok(true);
                }
                "n" | "no" => {
                    return Ok(false);
                }
                _ => {
                    log::error!("invalid option, please try again.");
                }
            }

            retry_left -= 1;
            if retry_left < 0 {
                bail!("max retry count exceeded");
            }
        }
    }
}
