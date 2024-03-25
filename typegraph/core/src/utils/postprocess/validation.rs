// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::TgError;
use crate::utils::postprocess::PostProcessor;
use common::typegraph::{validator::validate_typegraph, Typegraph};

pub struct ValidationProcessor;

impl PostProcessor for ValidationProcessor {
    fn postprocess(self, tg: &mut Typegraph) -> Result<(), TgError> {
        let errors = validate_typegraph(tg);
        let tg_name = tg.name().map_err(|e| e.to_string())?;
        if !errors.is_empty() {
            let mut stack = errors
                .into_iter()
                .map(|e| format!("at {}:{}: {}", tg_name, e.path, e.message))
                .collect::<Vec<_>>();
            stack.push(format!("Typegraph {tg_name} failed validation"));
            Err(stack.into())
        } else {
            Ok(())
        }
    }
}
