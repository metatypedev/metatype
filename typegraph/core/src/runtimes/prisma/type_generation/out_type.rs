// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
use crate::types::{Type, TypeId};

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
    fn generate(
        &self,
        context: &mut super::TypeGenContext,
    ) -> crate::errors::Result<crate::types::TypeId> {
        let mut builder = t::struct_();

        for (key, type_id) in self.model_id.as_struct()?.iter_props() {
            let rel = context.registry.find_relationship_on(self.model_id, key);

            if let Some(rel) = rel {
                if self.skip_rel.contains(&rel.name) || rel.left.model_type == rel.right.model_type
                {
                    continue;
                }
                let entry = rel.get(rel.side_of_type(type_id).unwrap());
                let mut skip_rel = self.skip_rel.clone();
                skip_rel.push(rel.name.clone());

                let out_type = context.generate(&OutType {
                    model_id: entry.model_type,
                    skip_rel,
                })?;

                let out_type = match entry.cardinality {
                    Cardinality::Optional => t::optional(out_type).build()?,
                    Cardinality::One => out_type,
                    Cardinality::Many => t::array(out_type).build()?,
                };

                builder.prop(key, out_type);
            } else {
                match type_id.attrs()?.concrete_type.as_type()? {
                    Type::Func(_) => {
                        // skip, other runtime
                        continue;
                    }
                    _ => {
                        builder.prop(key, type_id);
                    }
                }
            }
        }

        builder.named(self.name(context)).build()
    }

    fn name(&self, _context: &super::TypeGenContext) -> String {
        let model_name = self.model_id.type_name().unwrap().unwrap();
        let suffix = if self.skip_rel.is_empty() {
            String::new()
        } else {
            format!("_excluding_{}", self.skip_rel.join("_"))
        };
        format!("_{model_name}OutputType{suffix}")
    }
}
