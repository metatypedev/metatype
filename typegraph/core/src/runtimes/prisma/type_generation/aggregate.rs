// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    errors::Result,
    global_store::with_store,
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
        let keys = with_store(|s| {
            self.model_id
                .as_struct(s)
                .unwrap()
                .data
                .props
                .iter()
                .map(|(k, _)| k.clone())
                .collect::<Vec<_>>()
        });

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

        let props = with_store(|s| {
            self.model_id
                .as_struct(s)
                .unwrap()
                .data
                .props
                .iter()
                .filter_map(|(k, type_id)| {
                    let typ = s.get_type(type_id.into()).unwrap();
                    let typ = match typ {
                        Type::Optional(inner) => s.get_type(inner.data.of.into()).unwrap(),
                        _ => typ,
                    };
                    match typ {
                        Type::Optional(_) => {
                            Some(Err("optional of optional is not allowed".to_owned()))
                        }
                        Type::Integer(_) => Some(Ok((k.clone(), PropType::Int))),
                        Type::Float(_) => Some(Ok((k.clone(), PropType::Float))),
                        _ => None,
                    }
                })
                .collect::<Result<Vec<_>>>()
        })?;

        let mut builder = t::struct_();
        if self.avg {
            let opt_float = t::optional(t::float().build()?).build()?;
            for (key, _) in &props {
                builder.prop(key, opt_float);
            }
        } else {
            let opt_int = t::optional(t::integer().build()?).build()?;
            let opt_float = t::optional(t::float().build()?).build()?;
            for (key, prop_type) in &props {
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
