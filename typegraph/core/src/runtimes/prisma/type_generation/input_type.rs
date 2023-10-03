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
                inner.propx("create", t::optional(create))?;
                inner.propx("connect", t::optional(connect))?;

                if let Cardinality::Many = entry.cardinality {
                    inner.propx(
                        "createMany",
                        t::optionalx(t::struct_().propx("data", t::array(create))?)?,
                    )?;
                }

                // TODO what if cardinality is Cardinality::One ??
                builder.propx(k, t::optionalx(inner.min(1).max(1))?)?;
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
