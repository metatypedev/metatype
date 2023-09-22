// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::runtimes::prisma::type_utils::RuntimeConfig;
use crate::runtimes::prisma::{relationship::Cardinality, type_generation::where_::Where};
use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
use crate::types::{Type, TypeId};

use super::{TypeGen, TypeGenContext};

#[derive(Clone, Copy)]
enum Operation {
    Create,
    Update,
}

impl Operation {
    fn is_update(&self) -> bool {
        match self {
            Operation::Create => false,
            Operation::Update => true,
        }
    }
}

pub struct InputType {
    model_id: TypeId,
    skip_rel: Vec<String>,
    operation: Operation,
}

impl InputType {
    pub fn for_create(model_id: TypeId) -> Self {
        Self {
            model_id,
            skip_rel: vec![],
            operation: Operation::Create,
        }
    }

    pub fn for_update(model_id: TypeId) -> Self {
        Self {
            model_id,
            skip_rel: vec![],
            operation: Operation::Update,
        }
    }
}

impl TypeGen for InputType {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        let mut builder = t::struct_();

        for (k, type_id) in self.model_id.as_struct()?.iter_props() {
            let rel = context.registry.find_relationship_on(self.model_id, k);
            if let Some(rel) = rel {
                if self.skip_rel.contains(&rel.name) {
                    continue;
                }

                let entry = rel.get(rel.side_of_type(type_id).unwrap());
                // model
                let create = context.generate(&InputType {
                    model_id: entry.model_type,
                    skip_rel: {
                        let mut skip_rel = self.skip_rel.clone();
                        skip_rel.push(rel.name.clone());
                        skip_rel
                    },
                    operation: Operation::Create,
                })?;
                // TODO unique where
                let connect = context.generate(&Where::new(entry.model_type, false))?;

                let mut inner = t::struct_();
                inner.prop("create", t::optional(create).build()?);
                inner.prop("connect", t::optional(connect).build()?);

                if let Cardinality::Many = entry.cardinality {
                    let create_many = t::struct_()
                        .prop("data", t::array(create).build()?)
                        .build()?;
                    inner.prop("createMany", t::optional(create_many).build()?);
                }

                // TODO what if cardinality is Cardinality::One ??
                builder.prop(k, t::optional(inner.min(1).max(1).build()?).build()?);
            } else {
                let attrs = type_id.attrs()?;
                match attrs.concrete_type.as_type()? {
                    Type::Func(_) => continue,
                    typ => {
                        let is_auto = || -> Result<_> {
                            Ok(RuntimeConfig::try_from(&typ)?.get("auto")?.unwrap_or(false))
                        };
                        builder.prop(
                            k,
                            if self.operation.is_update() || is_auto()? {
                                t::optional(type_id).build()?
                            } else {
                                type_id
                            },
                        );
                    }
                }
            }
        }

        builder.named(self.name(context)).build()
    }

    fn name(&self, context: &TypeGenContext) -> String {
        let model_name = context
            .registry
            .models
            .get(&self.model_id)
            .unwrap()
            .name
            .clone();
        let suffix = if self.skip_rel.is_empty() {
            "".to_string()
        } else {
            format!("_excluding_{}", self.skip_rel.join("And"))
        };
        let op = match self.operation {
            Operation::Create => "Create",
            Operation::Update => "Update",
        };
        format!("_{model_name}_{op}Input{suffix}")
    }
}
