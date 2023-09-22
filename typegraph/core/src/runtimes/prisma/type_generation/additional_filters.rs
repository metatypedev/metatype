// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
use crate::{errors::Result, types::TypeId};

use super::{TypeGen, TypeGenContext};

pub struct Take;

impl TypeGen for Take {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        t::integer().x_min(0).named(self.name(context)).build()
    }

    fn name(&self, _context: &TypeGenContext) -> String {
        "_Take".to_string()
    }
}

pub struct Skip;

impl TypeGen for Skip {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        t::integer().x_min(0).named(self.name(context)).build()
    }

    fn name(&self, _context: &TypeGenContext) -> String {
        "_Skip".to_string()
    }
}

pub struct Distinct(pub TypeId);

impl TypeGen for Distinct {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        let cols = self
            .0
            .as_struct()?
            .iter_props()
            .map(|(k, _)| k.to_string())
            .collect::<Vec<_>>();

        t::array(t::string().enum_(cols).build()?)
            .named(self.name(context))
            .build()
    }

    fn name(&self, context: &TypeGenContext) -> String {
        let model_name = &context.registry.models.get(&self.0).unwrap().name;
        format!("_KeysOf_{model_name}")
    }
}
