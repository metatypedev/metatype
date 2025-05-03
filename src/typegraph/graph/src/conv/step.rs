// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use color_eyre::eyre::{eyre, Result};
use std::sync::Arc;

use crate::conv::map::ValueTypeKind;
use crate::conv::Conversion;
use crate::injection::InjectionNode;
use crate::path::{PathSegment, ValueTypePath};
use crate::types::{LinkFunction, LinkList, LinkObject, LinkOptional, LinkUnion};
use crate::{BooleanType, IntegerType, Type, TypeBase, WeakType};

use super::{dedup::DuplicationKeyGenerator, ConversionMap, MapItem, RelativePath, TypeKey};

pub struct ConversionStep<G: DuplicationKeyGenerator> {
    parent: WeakType,
    idx: u32,
    pub rpath: RelativePath, // pub??
    dkey: G::Key,
    injection: Option<Arc<crate::injection::InjectionNode>>,
}

impl<G: DuplicationKeyGenerator> ConversionStep<G>
where
    G::Key: Default,
{
    pub fn root() -> Self {
        Self {
            parent: WeakType::Object(Default::default()),
            idx: 0,
            rpath: RelativePath::root(),
            dkey: Default::default(),
            injection: None,
        }
    }
}

impl<G: DuplicationKeyGenerator> ConversionStep<G> {
    pub fn convert(
        &self,
        schema: &Arc<tg_schema::Typegraph>,
        conv: &mut Conversion<G>,
    ) -> Result<StepResult<G>> {
        // TODO what abount map.indirect
        let key: TypeKey;

        {
            let map_entry = conv
                .conversion_map
                .direct
                .get_mut(self.idx as usize)
                .ok_or_else(|| eyre!("type index out of bounds: {}", self.idx))?;
            if let MapItem::Unset = map_entry {
                key = map_entry.next_key(self.idx, &self.rpath, &self.dkey)?;
            } else {
                let mut map_entry = map_entry;
                match (&mut map_entry, &self.rpath) {
                    (MapItem::Value(value_type), RelativePath::Input(_))
                    | (MapItem::Value(value_type), RelativePath::Output(_)) => {
                        if value_type.find(&self.dkey).is_some() {
                            // hum
                            return Ok(Default::default());
                        } else {
                            key = map_entry.next_key(self.idx, &self.rpath, &self.dkey)?;
                        }
                    }
                    (MapItem::Namespace(_, _), RelativePath::NsObject(_)) => {
                        unreachable!("namespace type should not be converted more than once");
                    }
                    _ => {
                        // return error
                        unreachable!("mismatched type and path");
                    }
                }
            }
        }

        let (result, item) = self.convert_new(schema, key, conv)?;
        conv.conversion_map
            .direct
            .get_mut(self.idx as usize)
            .ok_or_else(|| eyre!("type index out of bounds: {}", self.idx))?
            .merge(item)?;

        Ok(result)
    }

    fn convert_new(
        &self,
        schema: &Arc<tg_schema::Typegraph>,
        key: TypeKey,
        conv: &mut Conversion<G>,
    ) -> Result<(StepResult<G>, MapItem<G::Key>)> {
        let type_node = schema
            .types
            .get(self.idx as usize)
            .ok_or_else(|| eyre!("type index out of bounds: {} (schema)", self.idx))?;

        use tg_schema::TypeNode as N;

        let base = TypeBase::new(
            type_node.base(),
            self.parent.clone(),
            key,
            self.injection.clone(),
        );

        match type_node {
            N::Boolean { .. } => {
                let ty = Type::Boolean(BooleanType { base }.into());
                Ok((
                    Default::default(),
                    MapItem::new(&ty, self.rpath.clone(), self.dkey.clone())?,
                ))
            }
            N::Integer { data, .. } => {
                let ty = Type::Integer(
                    IntegerType {
                        base,
                        minimum: data.minimum,
                        maximum: data.maximum,
                        exclusive_minimum: data.exclusive_minimum,
                        exclusive_maximum: data.exclusive_maximum,
                        multiple_of: data.multiple_of,
                    }
                    .into(),
                );
                Ok((
                    Default::default(),
                    MapItem::new(&ty, self.rpath.clone(), self.dkey.clone())?,
                ))
            }
            N::Float { data, .. } => {
                let ty = Type::Float(
                    crate::FloatType {
                        base,
                        minimum: data.minimum,
                        maximum: data.maximum,
                        exclusive_minimum: data.exclusive_minimum,
                        exclusive_maximum: data.exclusive_maximum,
                        multiple_of: data.multiple_of,
                    }
                    .into(),
                );
                Ok((
                    Default::default(),
                    MapItem::new(&ty, self.rpath.clone(), self.dkey.clone())?,
                ))
            }
            N::String {
                data,
                base: node_base,
            } => {
                let ty = Type::String(
                    crate::StringType {
                        base,
                        pattern: data.pattern.clone(),
                        format: data.format.clone(),
                        min_length: data.min_length,
                        max_length: data.max_length,
                        enumeration: node_base.enumeration.clone(),
                    }
                    .into(),
                );
                Ok((
                    Default::default(),
                    MapItem::new(&ty, self.rpath.clone(), self.dkey.clone())?,
                ))
            }
            N::File { data, .. } => {
                let ty = Type::File(
                    crate::FileType {
                        base,
                        min_size: data.min_size,
                        max_size: data.max_size,
                        mime_types: data.mime_types.clone(),
                    }
                    .into(),
                );
                Ok((
                    Default::default(),
                    MapItem::new(&ty, self.rpath.clone(), self.dkey.clone())?,
                ))
            }
            N::Optional { data, .. } => {
                let ty_inner = Arc::new(crate::OptionalType {
                    base,
                    item: crate::Once::default(),
                    default_value: data.default_value.clone(),
                });

                let ty = Type::Optional(ty_inner.clone());

                let mut result = StepResult::default();

                let path_seg = PathSegment::OptionalItem;
                let item_dkey = conv.dup_key_gen.apply_path_segment(&self.dkey, &path_seg);
                result.next.push(ConversionStep {
                    parent: ty.downgrade(),
                    idx: data.item,
                    rpath: self.rpath.push(path_seg)?,
                    dkey: item_dkey.clone(),
                    injection: self.injection.clone(),
                });

                // Add link_step for Optional
                result.link_step = Some(LinkStep::Optional(LinkOptional {
                    ty: ty_inner.clone(),
                    item: crate::conv::key::TypeKeyEx(data.item, item_dkey),
                }));

                Ok((
                    result,
                    MapItem::new(&ty, self.rpath.clone(), self.dkey.clone())?,
                ))
            }
            N::List { data, .. } => {
                let ty_inner = Arc::new(crate::ListType {
                    base,
                    item: crate::Once::default(),
                    min_items: data.min_items,
                    max_items: data.max_items,
                    unique_items: data.unique_items.unwrap_or(false),
                });

                let ty = Type::List(ty_inner.clone());

                let mut result = StepResult::default();

                let path_seg = PathSegment::ListItem;
                let item_dkey = conv.dup_key_gen.apply_path_segment(&self.dkey, &path_seg);
                result.next.push(ConversionStep {
                    parent: ty.downgrade(),
                    idx: data.items,
                    rpath: self.rpath.push(path_seg)?,
                    dkey: item_dkey.clone(),
                    injection: self.injection.clone(),
                });

                // Add link_step for List
                result.link_step = Some(LinkStep::List(LinkList {
                    ty: ty_inner.clone(),
                    item: crate::conv::key::TypeKeyEx(data.items, item_dkey),
                }));

                Ok((
                    result,
                    MapItem::new(&ty, self.rpath.clone(), self.dkey.clone())?,
                ))
            }
            N::Object { data, .. } => {
                let ty_inner = Arc::new(crate::ObjectType {
                    base,
                    properties: crate::Once::default(),
                });

                let ty = Type::Object(ty_inner.clone());

                let mut result = StepResult::default();

                let mut properties = indexmap::IndexMap::new();

                for (name, ty_idx) in &data.properties {
                    let name: Arc<str> = name.clone().into();
                    let path_seg = PathSegment::ObjectProp(name.clone());
                    let dkey = conv.dup_key_gen.apply_path_segment(&self.dkey, &path_seg);
                    let injection = self.injection.as_ref().and_then(|inj| {
                        use crate::injection::InjectionNode as I;
                        match inj.as_ref() {
                            I::Parent { children } => children.get(name.as_ref()).cloned(),
                            _ => None,
                        }
                    });

                    let as_id = data.id.iter().any(|id| id == name.as_ref());
                    let required = data.required.iter().any(|r| r == name.as_ref());
                    properties.insert(
                        name,
                        crate::types::LinkObjectProperty {
                            xkey: crate::conv::key::TypeKeyEx(*ty_idx, dkey.clone()),
                            policies: vec![],
                            injection: injection.clone(), // Why do we have two versions??
                            outjection: None,
                            required,
                            as_id,
                        },
                    );
                    result.next.push(ConversionStep {
                        parent: ty.downgrade(),
                        idx: *ty_idx,
                        rpath: self.rpath.push(path_seg)?,
                        dkey,
                        injection,
                    });
                }

                // Add link_step for Object
                result.link_step = Some(LinkStep::Object(LinkObject {
                    ty: ty_inner.clone(),
                    properties,
                }));

                Ok((
                    result,
                    MapItem::new(&ty, self.rpath.clone(), self.dkey.clone())?,
                ))
            }
            N::Either { data, .. } => {
                let ty_inner = Arc::new(crate::UnionType {
                    base,
                    variants: crate::Once::default(),
                    either: true,
                });

                let ty = Type::Union(ty_inner.clone());

                let mut result = StepResult::default();
                let mut variants = Vec::new();

                for (i, variant) in data.one_of.iter().enumerate() {
                    let path_seg = PathSegment::UnionVariant(i as u32);
                    let dkey = conv.dup_key_gen.apply_path_segment(&self.dkey, &path_seg);
                    variants.push(crate::conv::key::TypeKeyEx(*variant, dkey.clone()));
                    result.next.push(ConversionStep {
                        parent: ty.downgrade(),
                        idx: *variant,
                        rpath: self.rpath.push(path_seg)?,
                        dkey,
                        injection: self.injection.clone(),
                    });
                }

                result.link_step = Some(LinkStep::Union(LinkUnion {
                    ty: ty_inner.clone(),
                    variants,
                }));

                Ok((
                    result,
                    MapItem::new(&ty, self.rpath.clone(), self.dkey.clone())?,
                ))
            }
            N::Union { data, .. } => {
                let ty_inner = Arc::new(crate::UnionType {
                    base,
                    variants: crate::Once::default(),
                    either: false,
                });

                let ty = Type::Union(ty_inner.clone());

                let mut result = StepResult::default();
                let mut variants = Vec::new();

                for (i, variant) in data.any_of.iter().enumerate() {
                    let path_seg = PathSegment::UnionVariant(i as u32);
                    let dkey = conv.dup_key_gen.apply_path_segment(&self.dkey, &path_seg);
                    variants.push(crate::conv::key::TypeKeyEx(*variant, dkey.clone()));
                    result.next.push(ConversionStep {
                        parent: ty.downgrade(),
                        idx: *variant,
                        rpath: self.rpath.push(path_seg)?,
                        dkey,
                        injection: self.injection.clone(),
                    });
                }

                result.link_step = Some(LinkStep::Union(LinkUnion {
                    ty: ty_inner.clone(),
                    variants,
                }));

                Ok((
                    result,
                    MapItem::new(&ty, self.rpath.clone(), self.dkey.clone())?,
                ))
            }
            N::Function { data, .. } => {
                // Get the materializer from the conversion context
                let materializer = conv.get_materializer(data.materializer)?.clone();

                // Process injections
                let injections = data
                    .injections
                    .iter()
                    .filter_map(|(k, v)| {
                        crate::injection::InjectionNode::from_schema(
                            v,
                            materializer
                                .effect
                                .effect
                                .unwrap_or(tg_schema::EffectType::Read),
                        )
                        .map(|inj| (k.clone(), inj))
                    })
                    .collect();

                let effect = materializer
                    .effect
                    .effect
                    .unwrap_or(tg_schema::EffectType::Read);
                let ty_inner = Arc::new(crate::FunctionType {
                    base,
                    input: crate::Once::default(),
                    output: crate::Once::default(),
                    parameter_transform: data.parameter_transform.clone(),
                    injections,
                    runtime_config: data.runtime_config.clone(),
                    materializer,
                    rate_weight: data.rate_weight,
                    rate_calls: data.rate_calls,
                });

                let ty = Type::Function(ty_inner.clone());

                let mut result = StepResult::default();

                let schema_inj = tg_schema::InjectionNode::Parent {
                    children: data.injections.clone(), // TODO avoid cloning
                };
                let injection = InjectionNode::from_schema(&schema_inj, effect);
                let input_dkey = conv.dup_key_gen.gen_for_fn_input(&ty_inner);
                result.next.push(ConversionStep {
                    parent: ty.downgrade(),
                    idx: data.input,
                    rpath: RelativePath::Input(ValueTypePath {
                        owner: Arc::downgrade(&ty_inner),
                        branch: ValueTypeKind::Input,
                        path: vec![],
                    }),
                    dkey: input_dkey.clone(),
                    injection,
                });

                let output_dkey = conv.dup_key_gen.gen_for_fn_output(&ty_inner);
                result.next.push(ConversionStep {
                    parent: ty.downgrade(),
                    idx: data.output,
                    rpath: RelativePath::Output(ValueTypePath {
                        owner: Arc::downgrade(&ty_inner),
                        branch: ValueTypeKind::Output,
                        path: vec![],
                    }),
                    dkey: output_dkey.clone(),
                    injection: None, // TODO outjection
                });

                // Add link_step for Function
                result.link_step = Some(LinkStep::Function(LinkFunction {
                    ty: ty_inner.clone(),
                    input: crate::conv::key::TypeKeyEx(data.input, input_dkey),
                    output: crate::conv::key::TypeKeyEx(data.output, output_dkey),
                }));

                Ok((
                    result,
                    MapItem::new(&ty, RelativePath::Function(self.idx), self.dkey.clone())?,
                ))
            }
            N::Any { .. } => unreachable!(), // FIXME is this still used?
        }
    }

    // fn is_skippable(&self, map: &ConversionMap<G>) -> Result<bool> {
    //     let map_entry = map
    //         .direct
    //         .get(self.idx as usize)
    //         .ok_or_else(|| eyre!("type index out of bounds: {}", self.idx))?;
    //
    //     if let MapItem::Unset = &map_entry {
    //         return Ok(true);
    //     }
    //
    //     match (&map_entry, &self.rpath) {
    //         (MapItem::Value(value_type), RelativePath::Input(vtype_path)) => {
    //             if let Some(vtype) = value_type.get(self.idx) {
    //                 if vtype.relative_paths.contains(&vtype_path) {
    //                     return Ok(true);
    //                 }
    //             }
    //         }
    //         (MapItem::Namespace(object, _), RelativePath::NsObject(_)) => {
    //             if object.key() == self.parent.key() {
    //                 return Ok(true);
    //             }
    //         }
    //         _ => {}
    //     }
    //
    //     Ok(false)
    // }
}

pub struct StepResult<G: DuplicationKeyGenerator> {
    pub next: Vec<ConversionStep<G>>,
    pub link_step: Option<LinkStep<G>>,
}

impl<G: DuplicationKeyGenerator> Default for StepResult<G> {
    fn default() -> Self {
        Self {
            next: vec![],
            link_step: None,
        }
    }
}

pub enum LinkStep<G: DuplicationKeyGenerator> {
    Function(LinkFunction<G::Key>),
    Object(LinkObject<G::Key>),
    Union(LinkUnion<G::Key>),
    List(LinkList<G::Key>),
    Optional(LinkOptional<G::Key>),
}

impl<G: DuplicationKeyGenerator> LinkStep<G> {
    pub fn link(self, map: &ConversionMap<G>) -> Result<()> {
        match self {
            LinkStep::Function(link) => link.link(map),
            LinkStep::Object(link) => link.link(map),
            LinkStep::Union(link) => link.link(map),
            LinkStep::List(link) => link.link(map),
            LinkStep::Optional(link) => link.link(map),
        }
    }
}
