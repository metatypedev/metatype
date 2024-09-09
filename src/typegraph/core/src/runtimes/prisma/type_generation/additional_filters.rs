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
        t::integer().min(0).named(self.name()).build()
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
        let model_name = self.0.name().unwrap().unwrap();
        format!("_KeysOf_{model_name}")
    }
}

pub struct Cursor {
    model_id: TypeId,
}

impl Cursor {
    pub fn new(model_id: TypeId) -> Self {
        Self { model_id }
    }
}

impl TypeGen for Cursor {
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let model = context.model(self.model_id)?;
        let model = model.borrow();

        let fields = model
            .iter_props()
            .filter_map(|(k, prop)| match prop {
                Property::Scalar(t) => Some((k.to_string(), t.type_id)),
                _ => None,
            })
            .collect::<Vec<(String, TypeId)>>();

        let mut variants = vec![];
        for (k, id) in fields {
            let variant = t::struct_().prop(k, id).build()?;
            variants.push(variant)
        }
        t::union(variants).named(self.name()).build()
    }

    fn name(&self) -> String {
        let model_name = self.model_id.name().unwrap().unwrap();
        format!("_{}_Cursor", model_name)
    }
}
