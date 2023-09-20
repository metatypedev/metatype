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
        enum PropType {
            Scalar {
                type_id: TypeId,
                auto: bool,
            },
            Model {
                model_id: TypeId,
                cardinality: Cardinality,
                rel_name: String,
            },
        }
        struct Prop {
            key: String,
            typ: PropType,
        }

        let mut props = vec![];

        for (k, type_id) in self.model_id.as_struct().unwrap().iter_props() {
            let rel = context.registry.find_relationship_on(self.model_id, k);

            if let Some(rel) = rel {
                if self.skip_rel.contains(&rel.name) {
                    continue;
                }

                let entry = rel.get(rel.side_of_type(type_id).unwrap());
                props.push(Prop {
                    key: k.to_string(),
                    typ: PropType::Model {
                        model_id: entry.model_type,
                        cardinality: entry.cardinality,
                        rel_name: rel.name.clone(),
                    },
                });
            } else {
                let attrs = type_id.attrs()?;
                match attrs.concrete_type.as_type()? {
                    Type::Func(_) => continue,
                    typ => props.push(Prop {
                        key: k.to_string(),
                        typ: PropType::Scalar {
                            type_id,
                            auto: RuntimeConfig::try_from(&typ)?.get("auto")?.unwrap_or(false),
                        },
                    }),
                }
            }
        }

        let mut builder = t::struct_();

        for prop in props.into_iter() {
            match prop.typ {
                PropType::Scalar { type_id, auto } => {
                    builder.prop(
                        prop.key,
                        if self.operation.is_update() || auto {
                            t::optional(type_id).build()?
                        } else {
                            type_id
                        },
                    );
                }

                PropType::Model {
                    model_id,
                    cardinality,
                    rel_name,
                } => {
                    let create = context.generate(&InputType {
                        model_id,
                        skip_rel: {
                            let mut v = self.skip_rel.clone();
                            v.push(rel_name.clone());
                            v
                        },
                        operation: Operation::Create,
                    })?;
                    let mut inner = t::struct_();
                    inner.prop("create", t::optional(create).build()?);
                    inner.prop(
                        "connect",
                        // TODO unique where
                        t::optional(context.generate(&Where::new(model_id, false))?).build()?,
                    );

                    if let Cardinality::Many = cardinality {
                        inner.prop(
                            "createMany",
                            t::optional(
                                t::struct_()
                                    .prop("data", t::array(create).build()?)
                                    .build()?,
                            )
                            .build()?,
                        );
                    }

                    // TODO what if cardinality is Cardinality::One ??
                    builder.prop(prop.key, t::optional(inner.min(1).max(1).build()?).build()?);
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
