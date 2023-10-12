// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::runtimes::prisma::context::PrismaContext;
use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
use crate::{errors::Result, types::TypeId};

use super::TypeGen;

pub struct Take;

impl TypeGen for Take {
    fn generate(&self, _context: &PrismaContext) -> Result<TypeId> {
        t::integer().x_min(0).named(self.name()).build()
    }

    fn name(&self) -> String {
        "_Take".to_string()
    }
}

pub struct Skip;

impl TypeGen for Skip {
    fn generate(&self, _context: &PrismaContext) -> Result<TypeId> {
        t::integer().x_min(0).named(self.name()).build()
    }

    fn name(&self) -> String {
        "_Skip".to_string()
    }
}

pub struct Distinct(pub TypeId);

impl TypeGen for Distinct {
    fn generate(&self, _context: &PrismaContext) -> Result<TypeId> {
        let cols = self
            .0
            .as_struct()?
            .iter_props()
            .map(|(k, _)| k.to_string())
            .collect::<Vec<_>>();

        t::arrayx(t::string().enum_(cols))?
            .named(self.name())
            .build()
    }

    fn name(&self) -> String {
        let model_name = self.0.type_name().unwrap().unwrap();
        format!("_KeysOf_{model_name}")
    }
}
