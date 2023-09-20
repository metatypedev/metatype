// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::runtimes::prisma::type_generation::count::Count;
use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
use crate::types::{ProxyResolution, Type};
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
        enum Prop {
            Prisma {
                key: String,
                ty: TypeId,
                nest_count_exclude: Option<String>,
                cardinality: Cardinality,
            },
            Other {
                key: String,
                typ: TypeId,
            },
        }

        let mut props = vec![];
        let mut countable = vec![];

        // let registry_entry = context.registry.models.get(&self.model_id).unwrap();
        let model = self.model_id.as_struct().unwrap();
        for (k, ty) in model.iter_props() {
            if let Some(rel) = context.registry.find_relationship_on(self.model_id, k) {
                if self.skip.contains(&rel.name) {
                    continue;
                }
                // TODO get_concrete_type(resolve_proxy=true)
                let relation_model = rel.get_opposite_of(self.model_id, k).unwrap();
                match relation_model.cardinality {
                    Cardinality::Optional => {
                        props.push(Prop::Prisma {
                            key: k.to_string(),
                            ty: relation_model.model_type,
                            nest_count_exclude: Some(rel.name.clone()),
                            cardinality: Cardinality::Optional,
                        });
                        countable.push(k.to_string());
                    }
                    Cardinality::Many => {
                        props.push(Prop::Prisma {
                            key: k.to_string(),
                            ty: relation_model.model_type,
                            nest_count_exclude: Some(rel.name.clone()),
                            cardinality: Cardinality::Many,
                        });
                        countable.push(k.to_string());
                    }
                    Cardinality::One => {
                        props.push(Prop::Prisma {
                            key: k.to_string(),
                            ty: relation_model.model_type,
                            nest_count_exclude: None,
                            cardinality: Cardinality::One,
                        });
                    }
                }
            } else {
                let type_id = ty.concrete_type_id(ProxyResolution::Force)?.unwrap();
                match type_id.as_type()? {
                    Type::Func(_) => {
                        // TODO what if it is a nested prisma query/mutation?
                        props.push(Prop::Other {
                            key: k.to_string(),
                            typ: type_id,
                        })
                    }
                    _ => {
                        // simple type
                        props.push(Prop::Prisma {
                            key: k.to_string(),
                            ty,
                            nest_count_exclude: None,
                            cardinality: Cardinality::One,
                        });
                    }
                }
            }
        }

        let mut st = t::struct_();
        for prop in props.into_iter() {
            match prop {
                Prop::Prisma {
                    key,
                    ty,
                    nest_count_exclude,
                    cardinality,
                } => {
                    let mut ty = ty;
                    if let Some(exclude) = nest_count_exclude {
                        ty = context.generate(&WithNestedCount {
                            model_id: ty,
                            skip: [self.skip.as_slice(), &[exclude]].concat(),
                        })?;
                    }
                    match cardinality {
                        Cardinality::Optional => {
                            ty = t::optional(ty).build()?;
                        }
                        Cardinality::Many => {
                            ty = t::array(ty).build()?;
                        }
                        Cardinality::One => {}
                    }
                    st.prop(key, ty);
                }
                Prop::Other { key, typ } => {
                    st.prop(key, typ);
                }
            }
        }

        if !countable.is_empty() {
            let mut count = t::struct_();
            for prop in countable.into_iter() {
                count.prop(prop, context.generate(&Count)?);
            }
            st.prop("_count", count.build()?);
        }

        st.named(self.name(context)).build()
    }

    fn name(&self, _context: &TypeGenContext) -> String {
        let model_name = self.model_id.type_name().unwrap().unwrap();
        let suffix = if self.skip.is_empty() {
            "".to_string()
        } else {
            format!("_excluding_{}", self.skip.join("_"))
        };
        format!("{model_name}WithNestedCount{suffix}")
    }
}
