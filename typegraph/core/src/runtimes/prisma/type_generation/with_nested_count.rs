// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::runtimes::prisma::context::PrismaContext;
use crate::runtimes::prisma::type_generation::count::Count;
use crate::runtimes::prisma::utils::model::Property;
use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
use crate::types::ProxyResolution;
use crate::{runtimes::prisma::relationship::Cardinality, types::TypeId};

use super::TypeGen;

pub struct WithNestedCount {
    model_id: TypeId,
    skip: Vec<String>,
}

impl WithNestedCount {
    pub fn new(model_id: TypeId) -> Self {
        Self {
            model_id,
            skip: vec![],
        }
    }
}

impl TypeGen for WithNestedCount {
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let mut countable = vec![];
        let mut builder = t::struct_();

        let model = context.model(self.model_id)?;
        let model = model.borrow();
        for (key, prop) in model.iter_props() {
            match prop {
                Property::Model(prop) => {
                    let rel_name = model.relationships.get(key).ok_or_else(|| {
                        format!("relationship not registered: {}::{}", model.type_name, key)
                    })?;
                    let rel = context.relationships.get(rel_name).unwrap();

                    if self.skip.contains(rel_name) || rel.left.model_type == rel.right.model_type {
                        continue;
                    }

                    match prop.quantifier {
                        Cardinality::Optional => {
                            let inner = context.generate(&WithNestedCount {
                                model_id: prop.model_id,
                                skip: [self.skip.as_slice(), &[rel_name.clone()]].concat(),
                            })?;
                            builder.propx(key, t::optional(inner))?;
                            countable.push(key.to_string());
                        }

                        Cardinality::Many => {
                            let inner = context.generate(&WithNestedCount {
                                model_id: prop.model_id,
                                skip: [self.skip.as_slice(), &[rel_name.clone()]].concat(),
                            })?;
                            builder.propx(key, t::array(inner))?;
                            countable.push(key.to_string());
                        }

                        Cardinality::One => {
                            builder.prop(key, prop.model_id);
                        }
                    }
                }

                Property::Scalar(prop) => {
                    let type_id = prop
                        .wrapper_type_id
                        .concrete_type(ProxyResolution::Force)?
                        .unwrap();
                    builder.prop(key, type_id);
                }

                Property::Unmanaged(type_id) => {
                    builder.prop(key, *type_id);
                }
            }
        }

        if !countable.is_empty() {
            let mut count = t::struct_();
            for prop in countable.into_iter() {
                count.prop(prop, context.generate(&Count)?);
            }
            builder.propx("_count", count)?;
        }

        builder.named(self.name()).build()
    }

    fn name(&self) -> String {
        let model_name = self.model_id.type_name().unwrap().unwrap();
        let suffix = if self.skip.is_empty() {
            "".to_string()
        } else {
            format!("_excluding_{}", self.skip.join("_"))
        };
        format!("{model_name}WithNestedCount{suffix}")
    }
}
