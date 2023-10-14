// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::runtimes::prisma::context::PrismaContext;
use crate::runtimes::prisma::relationship::Cardinality;
use crate::runtimes::prisma::utils::model::{Property, ScalarType};
use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
use crate::types::TypeId;

use super::TypeGen;

pub struct UpdateInput {
    model_id: TypeId,
}

impl UpdateInput {
    pub fn new(model_id: TypeId) -> Self {
        Self { model_id }
    }
}

impl TypeGen for UpdateInput {
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let mut builder = t::struct_();

        let model = context.model(self.model_id)?;
        let model = model.borrow();

        for (key, prop) in model.iter_props() {
            // TODO check injection
            match prop {
                Property::Scalar(prop) => {
                    let mutation_type = if prop.quantifier == Cardinality::Many {
                        t::unionx![
                            prop.wrapper_type_id,
                            t::struct_().prop("set", prop.wrapper_type_id),
                            t::struct_().prop("push", prop.type_id),
                            // "unset": mongo only
                        ]
                        .build()?
                    } else {
                        let wrapper_type_id = prop.wrapper_type_id;
                        match prop.prop_type {
                            ScalarType::Boolean | ScalarType::String(_) => t::unionx![
                                wrapper_type_id,
                                t::struct_().prop("set", prop.wrapper_type_id)
                            ]
                            .build()?,
                            ScalarType::Integer | ScalarType::Float => t::unionx![
                                wrapper_type_id,
                                t::struct_().prop("set", wrapper_type_id),
                                t::struct_().prop("multiply", prop.type_id),
                                t::struct_().prop("decrement", prop.type_id),
                                t::struct_().prop("increment", prop.type_id),
                            ]
                            .build()?,
                        }
                    };
                    builder.propx(key, t::optional(mutation_type))?;
                }
                Property::Model(_) => continue,
                Property::Unmanaged(_) => continue,
            }
        }

        builder.named(self.name()).build()
    }

    fn name(&self) -> String {
        format!(
            "_{}_UpdateInput",
            self.model_id.type_name().unwrap().unwrap()
        )
    }
}
