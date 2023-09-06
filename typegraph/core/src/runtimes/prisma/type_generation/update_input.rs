// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
use crate::types::{Type, TypeFun};
use crate::{global_store::with_store, types::TypeId};

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
        enum PropType {
            Boolean,
            Integer,
            Float,
            String,
        }
        struct Prop {
            key: String,
            typ: PropType,
            type_id: TypeId,         // may be optional
            wrapped_type_id: TypeId, // non optional
        }

        let mut props = vec![];

        with_store(|s| -> Result<_> {
            for (k, type_id) in self.model_id.as_struct(s).unwrap().data.props.iter() {
                let attrs = s.get_attributes(type_id.into())?;
                // TODO check injection
                let typ = attrs.concrete_type.as_type(s)?;
                let (typ, nullable) = match typ {
                    Type::Optional(ty) => (s.get_type(ty.data.of.into())?, true),
                    _ => (typ, false),
                };

                // TODO array of scalar support?
                let prop_type = match typ {
                    Type::Optional(_) => return Err("".to_owned()),
                    Type::Boolean(_) => Some(PropType::Boolean),
                    Type::Integer(_) => Some(PropType::Integer),
                    Type::Float(_) => Some(PropType::Float),
                    Type::String(_) => Some(PropType::String),
                    _ => None,
                };

                if let Some(prop_type) = prop_type {
                    props.push(Prop {
                        key: k.to_string(),
                        typ: prop_type,
                        type_id: type_id.into(),
                        wrapped_type_id: typ.get_id(),
                    });
                }
            }
            Ok(())
        })?;

        let mut builder = t::struct_();
        for prop in props {
            let mutation_type = match prop.typ {
                PropType::Boolean | PropType::String => t::union([
                    prop.type_id,
                    t::struct_().prop("set", prop.type_id).build()?,
                ])
                .build()?,

                PropType::Integer | PropType::Float => t::union([
                    prop.type_id,
                    t::struct_().prop("set", prop.type_id).build()?,
                    t::struct_()
                        .prop("multiply", prop.wrapped_type_id)
                        .build()?,
                    t::struct_()
                        .prop("decrement", prop.wrapped_type_id)
                        .build()?,
                    t::struct_()
                        .prop("increment", prop.wrapped_type_id)
                        .build()?,
                ])
                .build()?,
            };

            builder.prop(prop.key, t::optional(mutation_type).build()?);
        }

        builder.named(self.name(context)).build()
    }

    fn name(&self, context: &super::TypeGenContext) -> String {
        format!(
            "_{}_UpdateInput",
            context.registry.models.get(&self.model_id).unwrap().name
        )
    }
}
