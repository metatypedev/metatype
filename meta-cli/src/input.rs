// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// TODO move this file

use std::borrow::Cow;

use actix::Addr;
use anyhow::{bail, Result};
use colored::Colorize;

use crate::deploy::actors::push_manager::PushManagerActor;

pub trait ConfirmHandler: std::fmt::Debug {
    fn on_confirm(&self, push_manager: Addr<PushManagerActor>);
    fn on_deny(&self, _push_manager: Addr<PushManagerActor>) {}
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
    prompt: String,
    max_retry_count: usize,
}

impl Select {
    pub fn new(prompt: String) -> Self {
        Self {
            prompt,
            max_retry_count: 0,
        }
    }

    pub fn max_retry_count(mut self, max_retry_count: usize) -> Self {
        self.max_retry_count = max_retry_count;
        self
    }

    pub fn interact(self, options: &[Box<dyn SelectOption + Send>]) -> Result<usize> {
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
            eprint!("> ");
            let mut input = String::new();
            std::io::stdin().read_line(&mut input).unwrap();
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
