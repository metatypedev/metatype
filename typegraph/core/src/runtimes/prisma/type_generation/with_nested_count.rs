// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::global_store::with_store;
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
        struct Prop {
            key: String,
            ty: TypeId,
            nest_count_exclude: Option<String>,
            cardinality: Cardinality,
        }

        let mut props = vec![];
        let mut countable = vec![];

        with_store(|s| -> Result<()> {
            let registry_entry = context.registry.models.get(&self.model_id).unwrap();
            for (k, ty) in s.type_as_struct(self.model_id).unwrap().data.props.iter() {
                if let Some(rel) = context.registry.find_relationship_on(self.model_id, k) {
                    if self.skip.contains(&rel.name) {
                        continue;
                    }
                    // TODO get_concrete_type(resolve_proxy=true)
                    let relation_model =
                        rel.get(rel.side_of_model(self.model_id).unwrap().opposite());
                    match relation_model.cardinality {
                        Cardinality::Optional => {
                            props.push(Prop {
                                key: k.clone(),
                                ty: relation_model.model_type,
                                nest_count_exclude: Some(rel.name.clone()),
                                cardinality: Cardinality::Optional,
                            });
                            countable.push(k.clone());
                        }
                        Cardinality::Many => {
                            props.push(Prop {
                                key: k.clone(),
                                ty: relation_model.model_type,
                                nest_count_exclude: Some(rel.name.clone()),
                                cardinality: Cardinality::Many,
                            });
                            countable.push(k.clone());
                        }
                        Cardinality::One => {
                            props.push(Prop {
                                key: k.clone(),
                                ty: relation_model.model_type,
                                nest_count_exclude: None,
                                cardinality: Cardinality::One,
                            });
                        }
                    }
                } else {
                    match TypeId(*ty)
                        .concrete_type_id(s, ProxyResolution::Force)?
                        .unwrap()
                        .as_type(s)?
                    {
                        Type::Func(_) => {
                            continue;
                        }
                        _ => {
                            // simple type
                            props.push(Prop {
                                key: k.clone(),
                                ty: (*ty).into(),
                                nest_count_exclude: None,
                                cardinality: Cardinality::One,
                            });
                        }
                    }
                }
            }
            Ok(())
        })?;

        let mut st = t::struct_();
        for prop in props.into_iter() {
            let mut ty = prop.ty;
            if let Some(exclude) = prop.nest_count_exclude {
                ty = context.generate(WithNestedCount {
                    model_id: ty,
                    skip: [self.skip.as_slice(), &[exclude]].concat(),
                })?;
            }
            match prop.cardinality {
                Cardinality::Optional => {
                    ty = t::optional(ty.into()).build()?;
                }
                Cardinality::Many => {
                    ty = t::array(ty.into()).build()?;
                }
                Cardinality::One => {}
            }
            st.prop(prop.key, ty.into());
        }

        if !countable.is_empty() {
            todo!()
            // props.push
        }

        st.named(self.name(context)).build()
    }

    fn name(&self, context: &TypeGenContext) -> String {
        let model_name = &context.registry.models.get(&self.model_id).unwrap().name;
        let suffix = if self.skip.is_empty() {
            "".to_string()
        } else {
            format!("_excluding_{}", self.skip.join("_"))
        };
        format!("{model_name}WithNestedCount{suffix}")
    }
}
