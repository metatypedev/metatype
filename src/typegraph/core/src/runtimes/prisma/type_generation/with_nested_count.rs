// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::runtimes::prisma::context::PrismaContext;
use crate::runtimes::prisma::model::Property;
use crate::runtimes::prisma::relationship::Cardinality;
use crate::runtimes::prisma::type_generation::count::Count;
use crate::t::{self, TypeBuilder as _};
use crate::types::{AsTypeDefEx as _, TypeDefExt, TypeId};

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
                        format!(
                            "relationship not registered: {}::{}",
                            model.model_type.name(),
                            key
                        )
                    })?;
                    let rel = context.relationships.get(rel_name).unwrap();

                    if self.skip.contains(rel_name) || rel.left.model_type == rel.right.model_type {
                        continue;
                    }

                    match prop.quantifier {
                        Cardinality::Optional => {
                            let inner = context.generate(&WithNestedCount {
                                model_id: prop.model_type.type_id,
                                skip: [self.skip.as_slice(), &[rel_name.clone()]].concat(),
                            })?;
                            builder.propx(key, t::optional(inner))?;
                            countable.push(key.to_string());
                        }

                        Cardinality::Many => {
                            let inner = context.generate(&WithNestedCount {
                                model_id: prop.model_type.type_id,
                                skip: [self.skip.as_slice(), &[rel_name.clone()]].concat(),
                            })?;
                            builder.propx(key, t::list(inner))?;
                            countable.push(key.to_string());
                        }

                        Cardinality::One => {
                            builder.prop(key, prop.model_type.type_id);
                        }
                    }
                }

                Property::Scalar(prop) => {
                    let type_id = prop.wrapper_type_id.as_xdef()?.type_def.id();
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

        builder.build_named(self.name())
    }

    fn name(&self) -> String {
        let model_name = self.model_id.name().unwrap().unwrap();
        let suffix = if self.skip.is_empty() {
            "".to_string()
        } else {
            format!("_excluding_{}", self.skip.join("_and_"))
        };
        format!("{model_name}_with_nested_count{suffix}")
    }
}
