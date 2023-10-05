// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
use crate::types::TypeId;
use crate::types::{Type, TypeFun};

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
    fn generate(&self, context: &mut super::TypeGenContext) -> Result<TypeId> {
        let mut builder = t::struct_();

        for (key, type_id) in self.model_id.as_struct().unwrap().iter_props() {
            let attrs = type_id.attrs()?;
            // TODO check injection
            let typ = attrs.concrete_type.as_type()?;
            let (typ, _nullable) = match typ {
                Type::Optional(inner) => (TypeId(inner.data.of).as_type()?, true),
                _ => (typ, false),
            };

            let mutation_type = match typ {
                Type::Optional(_) => unreachable!(),
                Type::Boolean(_) | Type::String(_) => {
                    t::unionx![type_id, t::struct_().prop("set", type_id)].build()?
                }
                Type::Integer(_) | Type::Float(_) => {
                    let wrapped_type_id = typ.get_id();
                    t::unionx![
                        wrapped_type_id,
                        t::struct_().prop("set", type_id),
                        t::struct_().prop("multiply", wrapped_type_id),
                        t::struct_().prop("decrement", wrapped_type_id),
                        t::struct_().prop("increment", wrapped_type_id),
                    ]
                    .build()?
                }
                Type::Array(inner) => {
                    if context
                        .registry
                        .find_relationship_on(self.model_id, key)
                        .is_some()
                    {
                        continue;
                    }
                    // scalar list: only supported in PostgreSQL, CockroachDB and MongoDB
                    // see: https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#relational-databases
                    let item_type = inner.data.of.into();
                    t::unionx![
                        type_id,
                        t::struct_().prop("set", type_id),
                        t::struct_().prop("push", item_type),
                        // "unset": mongo only
                    ]
                    .build()?
                }
                _ => {
                    // TODO: (mongo only) composite types
                    // see: https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#composite-type-methods
                    continue;
                }
            };

            builder.propx(key, t::optional(mutation_type))?;
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
