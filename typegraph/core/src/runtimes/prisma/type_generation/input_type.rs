// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::runtimes::prisma::context::PrismaContext;
use crate::runtimes::prisma::model::{InjectionHandler, Property};
use crate::runtimes::prisma::{relationship::Cardinality, type_generation::where_::Where};
use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
use crate::types::TypeId;

use super::TypeGen;

#[derive(Clone, Copy, Debug)]
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
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let mut builder = t::struct_();
        let model = context.model(self.model_id)?;
        let model = model.borrow();

        for (k, prop) in model.iter_props() {
            match prop {
                Property::Model(prop) => {
                    let rel_name = model.relationships.get(k).ok_or_else(|| {
                        format!("relationship not registered: {}::{}", model.type_name, k)
                    })?;
                    if self.skip_rel.contains(rel_name) {
                        continue;
                    }

                    let create = context.generate(&InputType {
                        model_id: prop.model_id,
                        skip_rel: {
                            let mut skip_rel = self.skip_rel.clone();
                            skip_rel.push(rel_name.to_string());
                            skip_rel
                        },
                        operation: Operation::Create,
                    })?;
                    let connect = context.generate(&Where::new(prop.model_id))?;
                    let connect_or_create = t::struct_()
                        .prop("create", create)
                        .prop("where", connect)
                        .build()?;

                    let mut inner = t::unionx!(
                        t::struct_().prop("create", create),
                        t::struct_().prop("connect", connect),
                        t::struct_().prop("connectOrCreate", connect_or_create),
                    );

                    if let Operation::Update = self.operation {
                        let update = context.generate(&InputType {
                            model_id: prop.model_id,
                            skip_rel: {
                                let mut skip_rel = self.skip_rel.clone();
                                skip_rel.push(rel_name.to_string());
                                skip_rel
                            },
                            operation: Operation::Update,
                        })?;
                        inner.addx(t::struct_().prop("update", update))?;

                        match prop.quantifier {
                            Cardinality::Optional => {
                                inner.addx(t::struct_().propx("disconnect", t::boolean())?)?;
                                inner.addx(t::struct_().propx("delete", t::boolean())?)?;

                                let upsert = t::struct_()
                                    .prop("create", create)
                                    .prop("update", update)
                                    .build()?;
                                inner.addx(t::struct_().prop("upsert", upsert))?;
                            }
                            Cardinality::Many => {
                                inner.addx(
                                    t::struct_().propx(
                                        "updateMany",
                                        t::struct_()
                                            .propx("where", t::optional(connect))?
                                            .prop("data", update),
                                    )?,
                                )?;

                                inner.addx(t::struct_().propx(
                                    "deleteMany",
                                    t::struct_().propx("where", t::optional(connect))?,
                                )?)?;
                            }
                            _ => (),
                        }
                    }

                    if let Cardinality::Many = prop.quantifier {
                        inner.addx(t::struct_().propx(
                            "createMany",
                            t::optionalx(t::struct_().propx("data", t::array(create))?)?,
                        )?)?;
                    }

                    if let (Operation::Create, Cardinality::One) = (self.operation, prop.quantifier)
                    {
                        builder.propx(k, inner)?;
                    } else {
                        builder.propx(k, t::optionalx(inner)?)?;
                    }
                }

                Property::Scalar(prop) => {
                    if let Some(inj) = &prop.injection {
                        match self.operation {
                            Operation::Create => {
                                if let Some(inj) = &inj.create {
                                    if !matches!(inj, &InjectionHandler::Typegate) {
                                        // value inserted by the prisma engine
                                        continue;
                                    }
                                }
                            }
                            Operation::Update => {
                                if let Some(inj) = &inj.update {
                                    if !matches!(inj, &InjectionHandler::Typegate) {
                                        // value inserted by the prisma engine
                                        continue;
                                    }
                                }
                            }
                        }
                    }
                    builder.prop(
                        k,
                        if self.operation.is_update() || prop.auto {
                            t::optional(prop.type_id).build()?
                        } else {
                            prop.wrapper_type_id
                        },
                    );
                }

                Property::Unmanaged(_) => continue,
            }
        }

        builder.named(self.name()).build()
    }

    fn name(&self) -> String {
        let model_name = self.model_id.type_name().unwrap().unwrap();
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
