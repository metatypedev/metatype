// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::runtimes::prisma::context::PrismaContext;
use crate::runtimes::prisma::model::{Property, ScalarType};
use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
use crate::types::TypeId;

use super::TypeGen;

pub struct CountOutput {
    model_id: TypeId,
}

impl CountOutput {
    pub fn new(model_id: TypeId) -> Self {
        Self { model_id }
    }
}

impl TypeGen for CountOutput {
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let mut builder = t::struct_();
        let opt_int = t::optionalx(t::integer())?.build()?;
        builder.prop("_all", opt_int);

        let model = context.model(self.model_id)?;
        let model = model.borrow();

        for (k, prop) in model.iter_props() {
            match prop {
                Property::Scalar(_) | Property::Model(_) => {
                    builder.prop(k, opt_int);
                }
                Property::Unmanaged(_) => continue,
            }
        }

        // TODO union
        builder.named(self.name()).build()
    }

    fn name(&self) -> String {
        let model_name = self.model_id.type_name().unwrap().unwrap();
        format!("_{}_AggrCount", model_name)
    }
}

pub struct NumberAggregateOutput {
    model_id: TypeId,
    avg: bool,
}

impl NumberAggregateOutput {
    pub fn new(model_id: TypeId, avg: bool) -> Self {
        Self { model_id, avg }
    }
}

impl TypeGen for NumberAggregateOutput {
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let mut builder = t::struct_();

        let opt_float = t::optionalx(t::float())?.build()?;
        let for_int = if self.avg {
            opt_float
        } else {
            t::optionalx(t::integer())?.build()?
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
                    _ => continue,
                },
                Property::Model(_) => continue,
                Property::Unmanaged(_) => continue,
            }
        }

        builder.named(self.name()).build()
    }

    fn name(&self) -> String {
        let model_name = self.model_id.type_name().unwrap().unwrap();
        let suffix = if self.avg { "_avg" } else { "" };
        format!("_{model_name}_NumberAgg{suffix}")
    }
}
