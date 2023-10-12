// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    errors::Result,
    runtimes::prisma::context::PrismaContext,
    t::{self, ConcreteTypeBuilder, TypeBuilder},
    types::{Type, TypeId},
};

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
    fn generate(&self, _context: &PrismaContext) -> Result<TypeId> {
        let mut builder = t::struct_();
        let opt_int = t::optionalx(t::integer())?.build()?;
        builder.prop("_all", opt_int);

        for (k, _) in self.model_id.as_struct()?.iter_props() {
            builder.prop(k, opt_int);
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
    fn generate(&self, _context: &PrismaContext) -> Result<TypeId> {
        let mut builder = t::struct_();

        let opt_float = t::optionalx(t::float())?.build()?;
        let for_int = if self.avg {
            opt_float
        } else {
            t::optionalx(t::integer())?.build()?
        };

        for (k, type_id) in self.model_id.as_struct()?.iter_props() {
            let type_id = type_id.non_optional_concrete_type()?;
            match type_id.as_type()? {
                Type::Integer(_) => {
                    builder.prop(k, for_int);
                }
                Type::Float(_) => {
                    builder.prop(k, opt_float);
                }
                Type::Optional(_) => unreachable!(),
                _ => {}
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
