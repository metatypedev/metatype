// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use indexmap::{IndexMap, IndexSet};

use crate::interlude::*;
use crate::path::ValueTypePath;
use crate::{Arc, FunctionType, ObjectType, Type, TypeNodeExt as _};
use std::collections::HashMap;

use super::dedup::{DupKey, DuplicationKeyGenerator};
use super::{RelativePath, TypeKey};

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub enum ValueTypeKind {
    Input,
    Output,
}

#[derive(Debug)]
pub struct MapValueItem {
    pub ty: Type,
    pub relative_paths: IndexSet<ValueTypePath>,
}

#[derive(Debug)]
pub struct ValueType<K: DupKey> {
    pub default: Option<MapValueItem>,
    // duplication
    pub variants: IndexMap<K, MapValueItem>,
}

impl<K: DupKey> ValueType<K> {
    pub fn get(&self, variant_idx: u32) -> Option<&MapValueItem> {
        let variant_idx = variant_idx as usize;
        if variant_idx == 0 {
            self.default.as_ref()
        } else {
            self.variants
                .get_index(variant_idx - 1)
                .map(|(_, item)| item)
        }
    }

    pub fn get_mut(&mut self, ordinal: u32) -> Option<&mut MapValueItem> {
        let ordinal = ordinal as usize;
        if ordinal == 0 {
            self.default.as_mut()
        } else {
            self.variants
                .get_index_mut(ordinal - 1)
                .map(|(_, item)| item)
        }
    }

    pub fn is_empty(&self) -> bool {
        self.default.is_none() && self.variants.is_empty()
    }
}

#[derive(Debug)]
pub enum MapItem<K: DupKey> {
    Unset,
    Namespace(Arc<ObjectType>, Vec<Arc<str>>),
    Function(Arc<FunctionType>),
    Value(ValueType<K>),
}

impl<K: DupKey> MapItem<K> {
    pub fn as_value(&self) -> Option<&ValueType<K>> {
        match self {
            Self::Value(v) => Some(v),
            _ => None,
        }
    }
}

#[derive(Debug)]
pub struct ConversionMap<G: DuplicationKeyGenerator> {
    dup_key_gen: G,
    pub direct: Vec<MapItem<G::Key>>,
    pub reverse: HashMap<RelativePath, TypeKey>,
}

impl<G: DuplicationKeyGenerator> ConversionMap<G> {
    pub fn new(schema: &tg_schema::Typegraph, dup_key_gen: &G) -> Self {
        let type_count = schema.types.len();
        let mut direct = Vec::with_capacity(type_count);
        direct.resize_with(type_count, || MapItem::Unset);
        Self {
            dup_key_gen: dup_key_gen.clone(),
            direct,
            reverse: Default::default(),
        }
    }

    pub fn get(&self, key: TypeKey) -> Option<Type> {
        match self.direct.get(key.0 as usize) {
            Some(MapItem::Unset) => None,
            Some(MapItem::Namespace(ty, _)) => {
                assert_eq!(key.1, 0);
                Some(Type::Object(Arc::clone(ty)))
            }
            Some(MapItem::Function(f)) => {
                assert_eq!(key.1, 0);
                Some(Type::Function(Arc::clone(f)))
            }
            Some(MapItem::Value(value_types)) => {
                let ordinal = key.1 as usize;
                if ordinal == 0 {
                    value_types.default.as_ref().map(|item| item.ty.clone())
                } else {
                    let index = ordinal - 1;
                    value_types
                        .variants
                        .get_index(index)
                        .map(|(_, item)| item.ty.clone())
                }
            }
            None => None, // unreachable
        }
    }
}

impl<G: DuplicationKeyGenerator> ConversionMap<G> {
    pub fn register(&mut self, rpath: RelativePath, node: Type) -> Result<()> {
        let key = node.key();
        let item = std::mem::replace(&mut self.direct[key.0 as usize], MapItem::Unset);
        let item = match item {
            MapItem::Unset => match &rpath {
                RelativePath::Function(_) => MapItem::Function(node.assert_func()?.clone()),
                RelativePath::NsObject(path) => {
                    MapItem::Namespace(node.assert_object()?.clone(), path.clone())
                }
                RelativePath::Input(_) => {
                    let dkey = self.dup_key_gen.gen_from_type(&node);
                    if dkey.is_default() || !node.is_composite() {
                        MapItem::Value(ValueType {
                            default: Some(MapValueItem {
                                ty: node.clone(),
                                relative_paths: std::iter::once(rpath.clone().try_into().map_err(
                                    |e| eyre!("relative path is not a value type: {:?}", e),
                                )?)
                                .collect(),
                            }),
                            variants: Default::default(),
                        })
                    } else {
                        let variant = MapValueItem {
                            ty: node.clone(),
                            relative_paths: std::iter::once(rpath.clone().try_into().map_err(
                                |e| eyre!("relative path is not a value type: {:?}", e),
                            )?)
                            .collect(),
                        };
                        let variants = std::iter::once((dkey, variant)).collect();
                        MapItem::Value(ValueType {
                            default: None,
                            variants,
                        })
                    }
                }
                RelativePath::Output(_) => {
                    MapItem::Value(ValueType {
                        default: Some(MapValueItem {
                            ty: node.clone(),
                            relative_paths: std::iter::once(rpath.clone().try_into().map_err(
                                |e| eyre!("relative path is not a value type: {:?}", e),
                            )?)
                            .collect(),
                        }),
                        variants: Default::default(),
                    })
                }
            },
            MapItem::Namespace(_, _) => {
                bail!("unexpected duplicate namespace type: {:?}", key)
            }
            MapItem::Function(_) => {
                bail!("unexpected duplicate function type: {:?}", key)
            }
            MapItem::Value(mut value_type) => {
                let rpath: ValueTypePath = rpath
                    .clone()
                    .try_into()
                    .map_err(|e| eyre!("relative path is not a value type: {:?}", e))?;
                let dkey = self.dup_key_gen.gen_from_type(&node);
                if key.1 == 0 {
                    debug_assert!(dkey.is_default());
                    if value_type.default.is_some() {
                        bail!("duplicate default value type: {:?}", key);
                    }
                    value_type.default = Some(MapValueItem {
                        ty: node.clone(),
                        relative_paths: std::iter::once(rpath).collect(),
                    });
                } else {
                    debug_assert!(!dkey.is_default());
                    let index = key.1 - 1;
                    if index != value_type.variants.len() as u32 {
                        bail!("unexpected ordinal number for type registration: {:?}", key);
                    }
                    value_type.variants.insert(
                        dkey,
                        MapValueItem {
                            ty: node.clone(),
                            relative_paths: std::iter::once(rpath).collect(),
                        },
                    );
                }
                MapItem::Value(value_type)
            }
        };
        self.direct[key.0 as usize] = item;

        let old = self.reverse.insert(rpath.clone(), key);
        if old.is_some() {
            bail!("duplicate relative path: {:?}", rpath);
        }

        Ok(())
    }

    /// Append a relative path to a value type with key `key`.
    /// Returns true if the relative path was appended, false if it was already present.
    pub fn append(&mut self, key: TypeKey, rpath: RelativePath) -> Result<bool> {
        let TypeKey(idx, variant) = key;
        let entry = self
            .direct
            .get_mut(idx as usize)
            .ok_or_else(|| eyre!("type index out of bound"))?;
        match entry {
            MapItem::Value(value_type) => {
                let item = value_type.get_mut(variant).ok_or_else(|| {
                    eyre!("value type not found: local index out of bound: {:?}", key)
                })?;
                let vtype_path = rpath
                    .clone()
                    .try_into()
                    .map_err(|e| eyre!("relative path is not a value type: {:?}", e))?;
                let added = item.relative_paths.insert(vtype_path);

                if !added {
                    return Ok(false);
                }
            }
            _ => bail!("unexpected map item: {:?}", key),
        }

        self.reverse.insert(rpath, key);

        Ok(true)
    }
}
