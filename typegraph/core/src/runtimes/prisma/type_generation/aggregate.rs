// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    errors::Result,
    t::{self, ConcreteTypeBuilder, TypeBuilder},
    types::{Type, TypeId},
};

use super::{TypeGen, TypeGenContext};

pub struct CountOutput {
    model_id: TypeId,
}

impl CountOutput {
    pub fn new(model_id: TypeId) -> Self {
        Self { model_id }
    }
}

impl TypeGen for CountOutput {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        let keys = self
            .model_id
            .as_struct()
            .unwrap()
            .iter_props()
            .map(|(k, _)| k.to_string())
            .collect::<Vec<_>>();

        let mut builder = t::struct_();
        let opt_int = t::optional(t::integer().build()?).build()?;
        builder.prop("_all", opt_int);
        for key in keys {
            builder.prop(key, opt_int);
        }

        // TODO union
        builder.named(self.name(context)).build()
    }

    fn name(&self, context: &TypeGenContext) -> String {
        let model_name = &context.registry.models.get(&self.model_id).unwrap().name;
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
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        enum PropType {
            Int,
            Float,
        }

        let props = self
            .model_id
            .as_struct()
            .unwrap()
            .iter_props()
            .filter_map(|(k, type_id)| {
                let typ = type_id.as_type().unwrap();
                let typ = match typ {
                    Type::Optional(inner) => inner.item().as_type().unwrap(),
                    _ => typ,
                };
                match typ {
                    Type::Optional(_) => {
                        Some(Err("optional of optional is not allowed".to_owned()))
                    }
                    Type::Integer(_) => Some(Ok((k.to_string(), PropType::Int))),
                    Type::Float(_) => Some(Ok((k.to_string(), PropType::Float))),
                    _ => None,
                }
            })
            .collect::<Result<Vec<_>>>()?;

        let mut builder = t::struct_();
        if self.avg {
            let opt_float = t::optional(t::float().build()?).build()?;
            for (key, _) in props.into_iter() {
                builder.prop(key, opt_float);
            }
        } else {
            let opt_int = t::optional(t::integer().build()?).build()?;
            let opt_float = t::optional(t::float().build()?).build()?;
            for (key, prop_type) in props.into_iter() {
                builder.prop(
                    key,
                    match prop_type {
                        PropType::Int => opt_int,
                        PropType::Float => opt_float,
                    },
                );
            }
        }

        builder.named(self.name(context)).build()
    }

    fn name(&self, context: &TypeGenContext) -> String {
        let model_name = &context.registry.models.get(&self.model_id).unwrap().name;
        let suffix = if self.avg { "_avg" } else { "" };
        format!("_{model_name}_NumberAgg{suffix}")
    }
}
