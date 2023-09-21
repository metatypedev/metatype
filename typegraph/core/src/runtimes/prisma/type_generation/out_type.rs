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
        enum PropType {
            Scalar(TypeId),
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

        for (k, id) in self.model_id.as_struct()?.iter_props() {
            let rel = context.registry.find_relationship_on(self.model_id, k);
            if let Some(rel) = rel {
                if self.skip_rel.contains(&rel.name) || rel.left.model_type == rel.right.model_type
                {
                    continue;
                }
                let entry = rel.get(rel.side_of_type(id).unwrap());
                props.push(Prop {
                    key: k.to_string(),
                    typ: PropType::Model {
                        model_id: entry.model_type,
                        cardinality: entry.cardinality,
                        rel_name: rel.name.clone(),
                    },
                })
            } else {
                match id.attrs()?.concrete_type.as_type()? {
                    Type::Func(_) => {
                        // skip, other runtime
                        continue;
                    }
                    _ => props.push(Prop {
                        key: k.to_string(),
                        typ: PropType::Scalar(id),
                    }),
                }
            }
        }

        let mut builder = t::struct_();
        builder.named(self.name(context));

        for prop in props.into_iter() {
            match prop.typ {
                PropType::Scalar(id) => {
                    builder.prop(prop.key, id);
                }
                PropType::Model {
                    model_id,
                    cardinality,
                    rel_name,
                } => {
                    let mut skip_rel = self.skip_rel.clone();
                    skip_rel.push(rel_name);

                    let ty = context.generate(&OutType { model_id, skip_rel })?;
                    let ty = match cardinality {
                        Cardinality::Optional => t::optional(ty).build()?,
                        Cardinality::One => ty,
                        Cardinality::Many => t::array(ty).build()?,
                    };

                    builder.prop(prop.key, ty);
                }
            }
        }

        builder.build()
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
