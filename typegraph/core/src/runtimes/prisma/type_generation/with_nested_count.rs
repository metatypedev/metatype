// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::runtimes::prisma::type_generation::count::Count;
use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
use crate::types::ProxyResolution;
use crate::{runtimes::prisma::relationship::Cardinality, types::TypeId};

use super::{TypeGen, TypeGenContext};

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
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        let mut countable = vec![];
        let mut builder = t::struct_();

        let model = self.model_id.as_struct().unwrap();
        for (key, type_id) in model.iter_props() {
            if let Some(rel) = context.registry.find_relationship_on(self.model_id, key) {
                if self.skip.contains(&rel.name) {
                    continue;
                }
                // TODO get_concrete_type(resolve_proxy=true)
                let relation_model = rel.get_opposite_of(self.model_id, key).unwrap();
                match relation_model.cardinality {
                    Cardinality::Optional => {
                        let inner = context.generate(&WithNestedCount {
                            model_id: relation_model.model_type,
                            skip: [self.skip.as_slice(), &[rel.name.clone()]].concat(),
                        })?;
                        builder.propx(key, t::optional(inner))?;
                        countable.push(key.to_string());
                    }
                    Cardinality::Many => {
                        let inner = context.generate(&WithNestedCount {
                            model_id: relation_model.model_type,
                            skip: [self.skip.as_slice(), &[rel.name.clone()]].concat(),
                        })?;
                        builder.propx(key, t::array(inner))?;
                        countable.push(key.to_string());
                    }
                    Cardinality::One => {
                        builder.prop(key, relation_model.model_type);
                    }
                }
            } else {
                let type_id = type_id.concrete_type(ProxyResolution::Force)?.unwrap();
                builder.prop(key, type_id);
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
