// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::runtimes::prisma::context::PrismaContext;
use crate::runtimes::prisma::model::{Property, ScalarType};
use crate::runtimes::prisma::type_generation::where_::Where;
use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
use crate::types::TypeId;

use super::{aggregate::CountOutput, TypeGen};

pub struct GroupingFields {
    model_id: TypeId,
}

impl GroupingFields {
    pub fn new(model_id: TypeId) -> Self {
        Self { model_id }
    }
}

impl TypeGen for GroupingFields {
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let model = context.model(self.model_id)?;
        let model = model.borrow();

        let fields = model
            .iter_props()
            .filter_map(|(k, prop)| match prop {
                Property::Scalar(_) => Some(k.to_string()),
                _ => None,
            })
            .collect();

        t::arrayx(t::string().enum_(fields))?
            .named(self.name())
            .build()
    }

    fn name(&self) -> String {
        let model_name = self.model_id.type_name().unwrap().unwrap();
        format!("_{}_GroupingFields", model_name)
    }
}

pub struct Having {
    model_id: TypeId,
}

impl Having {
    pub fn new(model_id: TypeId) -> Self {
        Self { model_id }
    }
}

impl TypeGen for Having {
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        // TODO relations??
        let where_type = context.generate(&Where::new(self.model_id).with_aggregates())?;

        let name = self.name();
        let self_ref = t::proxy(&name).build()?;

        t::unionx![
            where_type,
            t::struct_().propx("AND", t::array(self_ref))?,
            t::struct_().propx("OR", t::array(self_ref))?,
            t::struct_().prop("NOT", self_ref)
        ]
        .named(name)
        .build()
    }

    fn name(&self) -> String {
        let model_name = self.model_id.type_name().unwrap().unwrap();
        format!("_{}_Having", model_name)
    }
}

pub struct GroupByResult {
    model_id: TypeId,
}

impl GroupByResult {
    pub fn new(model_id: TypeId) -> Self {
        Self { model_id }
    }
}

impl TypeGen for GroupByResult {
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let model_id = self.model_id;
        t::array(
            t::struct_extends(model_id)?
                .prop(
                    "_count",
                    context.generate(&CountOutput::new(self.model_id))?, // TODO integer filter
                )
                .prop(
                    "_avg",
                    context.generate(&SelectNumbers::new(model_id, true))?,
                )
                .prop(
                    "_sum",
                    context.generate(&SelectNumbers::new(model_id, false))?,
                )
                .prop(
                    "_min",
                    context.generate(&SelectNumbers::new(model_id, false))?,
                )
                .prop(
                    "_max",
                    context.generate(&SelectNumbers::new(model_id, false))?,
                )
                .build()?,
        )
        .named(self.name())
        .build()
    }

    fn name(&self) -> String {
        let model_name = self.model_id.type_name().unwrap().unwrap();
        format!("_{}_GroupByResult", model_name)
    }
}

struct SelectNumbers {
    model_id: TypeId,
    promote_to_float: bool,
}

impl SelectNumbers {
    pub fn new(model_id: TypeId, promote_to_float: bool) -> Self {
        Self {
            model_id,
            promote_to_float,
        }
    }
}

impl TypeGen for SelectNumbers {
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let mut builder = t::struct_();
        let opt_float = t::optional(t::float().build()?).build()?;
        let for_int = if self.promote_to_float {
            opt_float
        } else {
            t::optional(t::integer().build()?).build()?
        };

        let model = context.model(self.model_id)?;
        let model = model.borrow();

        for (k, prop) in model.iter_props() {
            match prop {
                Property::Scalar(prop) => match prop.prop_type {
                    ScalarType::Integer => {
                        builder.prop(k, for_int);
                    }
                    ScalarType::Float => {
                        builder.prop(k, opt_float);
                    }
                    _ => {}
                },
                Property::Model(_) => {}
                Property::Unmanaged(_) => {}
            }
        }

        builder.named(self.name()).build()
    }

    fn name(&self) -> String {
        let model_name = self.model_id.type_name().unwrap().unwrap();
        let suffix = if self.promote_to_float { "_1" } else { "" };
        format!("_{model_name}_SelectNumbers_{suffix}")
    }
}
