// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::runtimes::prisma::context::PrismaContext;
use crate::runtimes::prisma::model::Property;
use crate::t::{self, TypeBuilder};
use crate::types::Named as _;
use crate::{errors::Result, types::TypeId};

use super::TypeGen;

pub struct Take;

impl TypeGen for Take {
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        t::integer()
            .x_min(0)
            .build()?
            .named(self.name(context)?)
            .map(|t| t.id())
    }

    fn name(&self, _context: &PrismaContext) -> Result<String> {
        Ok("_take".to_string())
    }
}

pub struct Skip;

impl TypeGen for Skip {
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        t::integer().min(0).build_named(self.name(context)?)
    }

    fn name(&self, _context: &PrismaContext) -> Result<String> {
        Ok("_skip".to_string())
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

        t::listx(t::string().enum_(cols)).build_named(self.name(context)?)
    }

    fn name(&self, _context: &PrismaContext) -> Result<String> {
        let model_name = self.0.name().unwrap().unwrap();
        Ok(format!("{model_name}_keys_union"))
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
        t::union(variants).build_named(self.name(context)?)
    }

    fn name(&self, _context: &PrismaContext) -> Result<String> {
        let model_name = self.model_id.name().unwrap().unwrap();
        Ok(format!("{}_cursor", model_name))
    }
}
