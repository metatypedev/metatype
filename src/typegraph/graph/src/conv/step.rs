// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use color_eyre::eyre::{eyre, Result};
use std::sync::Arc;

use crate::conv::key::TypeKeyEx;
use crate::conv::map::ValueTypeKind;
use crate::injection::InjectionNode;
use crate::path::{PathSegment, ValueTypePath};
use crate::types::{LinkFunction, LinkList, LinkObject, LinkOptional, LinkUnion};
use crate::{BooleanType, IntegerType, Type, TypeBase, WeakType};

use super::Registry;
use super::{dedup::DupKeyGen, ConversionMap, MapItem, RelativePath, TypeKey};

pub struct ConversionStep<G: DupKeyGen> {
    parent: WeakType,
    pub idx: u32,            // TODO
    pub rpath: RelativePath, // pub??
    dkey: G::Key,
    injection: Option<Arc<crate::injection::InjectionNode>>,
}

impl<G: DupKeyGen> ConversionStep<G>
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

pub enum StepPlan {
    /// the node has already been converted in a previous step
    Skip,
    /// the node needs to be converted under the given `TypeKey`
    Create(TypeKey),
}

impl<G: DupKeyGen> ConversionStep<G> {
    pub fn convert(
        &self,
        schema: &Arc<tg_schema::Typegraph>,
        key: TypeKey,
        dkey_gen: &G,
        registry: &Registry,
    ) -> Result<(StepResult<G>, MapItem<G::Key>)> {
        let type_node = schema
            .types
            .get(self.idx as usize)
            .ok_or_else(|| eyre!("type index out of bounds: {} (schema)", self.idx))?;

        let base = TypeBase::new(
            type_node.base(),
            self.parent.clone(),
            key,
            self.injection.clone(),
        );

        use tg_schema::TypeNode as N;
        match type_node {
            N::Boolean { .. } => self.convert_boolean(base),
            N::Integer { data, .. } => self.convert_integer(base, data),
            N::Float { data, .. } => self.convert_float(base, data),
            N::String {
                data,
                base: node_base,
            } => self.convert_string(base, data, node_base),
            N::File { data, .. } => self.convert_file(base, data),
            N::Optional { data, .. } => self.convert_optional(base, data, dkey_gen),
            N::List { data, .. } => self.convert_list(base, data, dkey_gen),
            N::Object { data, .. } => self.convert_object(base, data, dkey_gen),
            N::Either { data, .. } => self.convert_either(base, data, dkey_gen),
            N::Union { data, .. } => self.convert_union(base, data, dkey_gen),
            N::Function { data, .. } => self.convert_function(base, data, dkey_gen, registry),
            N::Any { .. } => unreachable!(), // FIXME is this still used?
        }
    }

    fn convert_boolean(&self, base: TypeBase) -> Result<(StepResult<G>, MapItem<G::Key>)> {
        let ty = Type::Boolean(BooleanType { base }.into());
        Ok((
            Default::default(),
            MapItem::new(&ty, self.rpath.clone(), self.dkey.clone())?,
        ))
    }

    fn convert_integer(
        &self,
        base: TypeBase,
        data: &tg_schema::IntegerTypeData,
    ) -> Result<(StepResult<G>, MapItem<G::Key>)> {
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

    fn convert_float(
        &self,
        base: TypeBase,
        data: &tg_schema::FloatTypeData,
    ) -> Result<(StepResult<G>, MapItem<G::Key>)> {
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

    fn convert_string(
        &self,
        base: TypeBase,
        data: &tg_schema::StringTypeData,
        node_base: &tg_schema::TypeNodeBase,
    ) -> Result<(StepResult<G>, MapItem<G::Key>)> {
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

    fn convert_file(
        &self,
        base: TypeBase,
        data: &tg_schema::FileTypeData,
    ) -> Result<(StepResult<G>, MapItem<G::Key>)> {
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

    fn convert_optional(
        &self,
        base: TypeBase,
        data: &tg_schema::OptionalTypeData,
        dkey_gen: &G,
    ) -> Result<(StepResult<G>, MapItem<G::Key>)> {
        let ty_inner = Arc::new(crate::OptionalType {
            base,
            item: crate::Once::default(),
            default_value: data.default_value.clone(),
        });

        let ty = Type::Optional(ty_inner.clone());

        let mut result = StepResult::default();

        let path_seg = PathSegment::OptionalItem;
        let item_dkey = dkey_gen.apply_path_segment(&ty, &path_seg);
        result.next.push(ConversionStep {
            parent: ty.downgrade(),
            idx: data.item,
            rpath: self.rpath.push(path_seg)?,
            dkey: item_dkey.clone(),
            injection: self.injection.clone(),
        });

        result.link_step = Some(LinkStep::Optional(LinkOptional {
            ty: ty_inner.clone(),
            item: TypeKeyEx(data.item, item_dkey),
        }));

        Ok((
            result,
            MapItem::new(&ty, self.rpath.clone(), self.dkey.clone())?,
        ))
    }

    fn convert_list(
        &self,
        base: TypeBase,
        data: &tg_schema::ListTypeData,
        dkey_gen: &G,
    ) -> Result<(StepResult<G>, MapItem<G::Key>)> {
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
        let item_dkey = dkey_gen.apply_path_segment(&ty, &path_seg);
        result.next.push(ConversionStep {
            parent: ty.downgrade(),
            idx: data.items,
            rpath: self.rpath.push(path_seg)?,
            dkey: item_dkey.clone(),
            injection: self.injection.clone(),
        });

        result.link_step = Some(LinkStep::List(LinkList {
            ty: ty_inner.clone(),
            item: TypeKeyEx(data.items, item_dkey),
        }));

        Ok((
            result,
            MapItem::new(&ty, self.rpath.clone(), self.dkey.clone())?,
        ))
    }

    fn convert_object(
        &self,
        base: TypeBase,
        data: &tg_schema::ObjectTypeData,
        dkey_gen: &G,
    ) -> Result<(StepResult<G>, MapItem<G::Key>)> {
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
            let dkey = dkey_gen.apply_path_segment(&ty, &path_seg);
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
                    xkey: TypeKeyEx(*ty_idx, dkey.clone()),
                    policies: vec![],
                    injection: injection.clone(),
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

        result.link_step = Some(LinkStep::Object(LinkObject {
            ty: ty_inner.clone(),
            properties,
        }));

        Ok((
            result,
            MapItem::new(&ty, self.rpath.clone(), self.dkey.clone())?,
        ))
    }

    fn convert_either(
        &self,
        base: TypeBase,
        data: &tg_schema::EitherTypeData,
        dkey_gen: &G,
    ) -> Result<(StepResult<G>, MapItem<G::Key>)> {
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
            let dkey = dkey_gen.apply_path_segment(&ty, &path_seg);
            variants.push(TypeKeyEx(*variant, dkey.clone()));
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

    fn convert_union(
        &self,
        base: TypeBase,
        data: &tg_schema::UnionTypeData,
        dkey_gen: &G,
    ) -> Result<(StepResult<G>, MapItem<G::Key>)> {
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
            let dkey = dkey_gen.apply_path_segment(&ty, &path_seg);
            variants.push(TypeKeyEx(*variant, dkey.clone()));
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

    fn convert_function(
        &self,
        base: TypeBase,
        data: &tg_schema::FunctionTypeData,
        dkey_gen: &G,
        registry: &Registry,
    ) -> Result<(StepResult<G>, MapItem<G::Key>)> {
        let materializer = registry
            .materializers
            .get(data.materializer as usize)
            .ok_or_else(|| eyre!("materializer index out of bounds"))?
            .clone();
        let effect = materializer
            .effect
            .effect
            .unwrap_or(tg_schema::EffectType::Read);

        let injection = Some(&data.injections)
            .filter(|injections| !injections.is_empty())
            .map(|injections| {
                Arc::new(InjectionNode::Parent {
                    children: injections
                        .iter()
                        .filter_map(|(k, v)| {
                            crate::injection::InjectionNode::from_schema(v, effect)
                                .map(|inj| (k.clone(), inj))
                        })
                        .collect(),
                })
            });

        let ty_inner = Arc::new(crate::FunctionType {
            base,
            input: crate::Once::default(),
            output: crate::Once::default(),
            parameter_transform: data.parameter_transform.clone(),
            injection: injection.clone(),
            runtime_config: data.runtime_config.clone(),
            materializer,
            rate_weight: data.rate_weight,
            rate_calls: data.rate_calls,
        });

        let ty = Type::Function(ty_inner.clone());

        let mut result = StepResult::default();

        let input_dkey = dkey_gen.gen_for_fn_input(&ty_inner);
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

        let output_dkey = dkey_gen.gen_for_fn_output(&ty_inner);
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

        result.link_step = Some(LinkStep::Function(LinkFunction {
            ty: ty_inner.clone(),
            input: TypeKeyEx(data.input, input_dkey),
            output: TypeKeyEx(data.output, output_dkey),
        }));

        Ok((
            result,
            MapItem::new(&ty, RelativePath::Function(self.idx), self.dkey.clone())?,
        ))
    }

    pub fn plan(&self, map: &ConversionMap<G>) -> Result<StepPlan> {
        let map_entry = map
            .direct
            .get(self.idx as usize)
            .ok_or_else(|| eyre!("type index out of bounds: {}", self.idx))?;
        if let MapItem::Unset = map_entry {
            Ok(StepPlan::Create(map_entry.next_key(
                self.idx,
                &self.rpath,
                &self.dkey,
            )?))
        } else {
            match (&map_entry, &self.rpath) {
                (MapItem::Value(value_type), RelativePath::Input(_))
                | (MapItem::Value(value_type), RelativePath::Output(_)) => {
                    if value_type.find(&self.dkey).is_some() {
                        Ok(StepPlan::Skip)
                    } else {
                        Ok(StepPlan::Create(map_entry.next_key(
                            self.idx,
                            &self.rpath,
                            &self.dkey,
                        )?))
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
}

pub struct StepResult<G: DupKeyGen> {
    pub next: Vec<ConversionStep<G>>,
    pub link_step: Option<LinkStep<G>>,
}

impl<G: DupKeyGen> Default for StepResult<G> {
    fn default() -> Self {
        Self {
            next: vec![],
            link_step: None,
        }
    }
}

pub enum LinkStep<G: DupKeyGen> {
    Function(LinkFunction<G::Key>),
    Object(LinkObject<G::Key>),
    Union(LinkUnion<G::Key>),
    List(LinkList<G::Key>),
    Optional(LinkOptional<G::Key>),
}

impl<G: DupKeyGen> LinkStep<G> {
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
