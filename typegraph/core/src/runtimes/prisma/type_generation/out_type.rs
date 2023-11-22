// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::runtimes::prisma::context::PrismaContext;
use crate::runtimes::prisma::errors;
use crate::runtimes::prisma::model::Property;
use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
use crate::types::TypeId;

use super::{Cardinality, TypeGen};

pub struct OutType {
    model_id: TypeId,
    skip_rel: Vec<String>, // list of relationships to skip to avoid infinite recursion
}

impl OutType {
    pub fn new(model_id: TypeId) -> Self {
        Self {
            model_id,
            skip_rel: vec![],
        }
    }
}

impl TypeGen for OutType {
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let mut builder = t::struct_();

        let model = context.model(self.model_id)?;
        let model = model.borrow();

        for (key, prop) in model.iter_props() {
            match prop {
                Property::Model(prop) => {
                    let rel_name = model
                        .relationships
                        .get(key)
                        .ok_or_else(|| errors::unregistered_relationship(&model.type_name, key))?;
                    let rel = context.relationships.get(rel_name).unwrap();
                    if self.skip_rel.contains(rel_name)
                        || rel.left.model_type == rel.right.model_type
                    {
                        continue;
                    }

                    let mut skip_rel = self.skip_rel.clone();
                    skip_rel.push(rel_name.clone());

                    let out_type = context.generate(&OutType {
                        model_id: prop.model_id,
                        skip_rel,
                    })?;

                    let out_type = match prop.quantifier {
                        Cardinality::Optional => t::optional(out_type).build()?,
                        Cardinality::One => out_type,
                        Cardinality::Many => t::list(out_type).build()?,
                    };

                    builder.prop(key, out_type);
                }
                Property::Scalar(prop) => {
                    builder.prop(key, prop.wrapper_type_id);
                }
                Property::Unmanaged(type_id) => {
                    // just forward the original type
                    builder.prop(key, *type_id);
                }
            }
        }

        builder.named(self.name()).build()
    }

    fn name(&self) -> String {
        let model_name = self.model_id.name().unwrap().unwrap();
        let suffix = if self.skip_rel.is_empty() {
            String::new()
        } else {
            format!("_excluding_{}", self.skip_rel.join("_"))
        };
        format!("_{model_name}OutputType{suffix}")
    }
}
