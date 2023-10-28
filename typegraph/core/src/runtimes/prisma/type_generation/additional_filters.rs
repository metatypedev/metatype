// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::runtimes::prisma::context::PrismaContext;
use crate::runtimes::prisma::model::Property;
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
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let model = context.model(self.0)?;
        let model = model.borrow();

        let cols: Vec<_> = model
            .iter_props()
            .filter_map(|(k, prop)| match prop {
                Property::Scalar(_) | Property::Model(_) => Some(k.to_string()),
                Property::Unmanaged(_) => None,
            })
            .collect();

        t::listx(t::string().enum_(cols))?
            .named(self.name())
            .build()
    }

    fn name(&self) -> String {
        let model_name = self.0.type_name().unwrap().unwrap();
        format!("_KeysOf_{model_name}")
    }
}
