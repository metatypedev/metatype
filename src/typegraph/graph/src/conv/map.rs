// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use indexmap::{IndexMap, IndexSet};

use crate::interlude::*;
use crate::path::ValueTypePath;
use crate::{Arc, FunctionType, ObjectType, Type, TypeNodeExt as _};
use std::collections::HashMap;

use super::dedup::{DupKey, DuplicationKeyGenerator};
use super::key::TypeKeyEx;
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

impl MapValueItem {
    pub fn branches(&self) -> (bool, bool) {
        let mut input = false;
        let mut output = false;

        for path in &self.relative_paths {
            match &path.branch {
                ValueTypeKind::Input => {
                    input = true;
                    if output {
                        break;
                    }
                }
                ValueTypeKind::Output => {
                    output = true;
                    if input {
                        break;
                    }
                }
            }
        }

        (input, output)
    }
}

#[derive(Debug)]
pub struct ValueType<K: DupKey> {
    pub default: Option<MapValueItem>,
    // duplication
    pub variants: IndexMap<K, MapValueItem>,
}

impl<K: DupKey + std::fmt::Debug> ValueType<K> {
    pub fn iter(&self, idx: u32) -> impl Iterator<Item = (TypeKey, &MapValueItem)> {
        self.default
            .iter()
            .map(move |i| (TypeKey(idx, 0), i))
            .chain(
                self.variants
                    .iter()
                    .enumerate()
                    .map(move |(i, (k, v))| (TypeKey(idx, i as u32 + 1), v)),
            )
    }

    fn merge(&mut self, other: Self) -> Result<()> {
        if self.default.is_none() {
            if other.default.is_some() && !other.variants.is_empty() {
                bail!("cannot merge more than a single item into ValueType")
            }
            self.default = other.default;
        } else {
            bail!("ValueType::default already set; cannot merge")
        }
        match other.variants.len() {
            0 => {}
            1 => {
                let (dkey, item) = other.variants.into_iter().next().unwrap();
                if self.variants.contains_key(&dkey) {
                    bail!("ValueType::variants already has item with key {dkey:?}")
                }
                if (item.ty.key().1 as usize) != self.variants.len() + 1 {
                    bail!("cannot merge ValueType with invalid key")
                }
                self.variants.insert(dkey, item);
            }
            _ => bail!("cannot merge more than a single item into ValueType"),
        }
        Ok(())
    }
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

    pub fn find(&self, key: &K) -> Option<&MapValueItem> {
        if key.is_default() {
            self.default.as_ref()
        } else {
            self.variants.get(key)
        }
    }

    pub fn find_mut(&mut self, key: &K) -> Option<&mut MapValueItem> {
        if key.is_default() {
            self.default.as_mut()
        } else {
            self.variants.get_mut(key)
        }
    }

    pub fn is_empty(&self) -> bool {
        self.default.is_none() && self.variants.is_empty()
    }

    fn extend(
        &mut self,
        node: Type,
        rpath: RelativePath,
        dup_key_gen: &impl DuplicationKeyGenerator<Key = K>,
    ) -> Result<()> {
        let rpath: ValueTypePath = rpath
            .try_into()
            .map_err(|e| eyre!("relative path is not a value type: {:?}", e))?;
        let dkey = dup_key_gen.gen_from_type(&node);
        let key = node.key();
        if key.1 == 0 {
            debug_assert!(dkey.is_default());
            if self.default.is_some() {
                bail!("duplicate default value type: {:?}", key);
            }
            self.default = Some(MapValueItem {
                ty: node.clone(),
                relative_paths: std::iter::once(rpath).collect(),
            });
        } else {
            debug_assert!(!dkey.is_default());
            let index = key.1 - 1;
            if index != self.variants.len() as u32 {
                bail!("unexpected ordinal number for type registration: {:?}", key);
            }
            self.variants.insert(
                dkey,
                MapValueItem {
                    ty: node.clone(),
                    relative_paths: std::iter::once(rpath).collect(),
                },
            );
        }

        Ok(())
    }
}

#[derive(Debug)]
pub enum MapItem<K: DupKey + std::fmt::Debug> {
    Unset,
    Namespace(Arc<ObjectType>, Vec<Arc<str>>),
    Function(Arc<FunctionType>),
    Value(ValueType<K>),
}

impl<K: DupKey + std::fmt::Debug> MapItem<K> {
    pub fn as_value(&self) -> Option<&ValueType<K>> {
        match self {
            Self::Value(v) => Some(v),
            _ => None,
        }
    }

    pub fn new2(ty: &Type, rpath: RelativePath, dkey: K) -> Result<Self> {
        Ok(match &rpath {
            RelativePath::Function(_) => MapItem::Function(ty.assert_func()?.clone()),
            RelativePath::NsObject(path) => {
                eprintln!("namespace object: {:?}", path);
                MapItem::Namespace(ty.assert_object()?.clone(), path.clone())
            }
            RelativePath::Input(_) => {
                if dkey.is_default() || !ty.is_composite() {
                    MapItem::Value(ValueType {
                        default: Some(MapValueItem {
                            ty: ty.clone(),
                            relative_paths: std::iter::once(rpath.clone().try_into().map_err(
                                |e| eyre!("relative path is not a value type: {:?}", e),
                            )?)
                            .collect(),
                        }),
                        variants: Default::default(),
                    })
                } else {
                    let variant =
                        MapValueItem {
                            ty: ty.clone(),
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
            RelativePath::Output(_) => MapItem::Value(ValueType {
                default: Some(MapValueItem {
                    ty: ty.clone(),
                    relative_paths: std::iter::once(
                        rpath
                            .clone()
                            .try_into()
                            .map_err(|e| eyre!("relative path is not a value type: {:?}", e))?,
                    )
                    .collect(),
                }),
                variants: Default::default(),
            }),
        })
    }

    fn new(
        ty: &Type,
        rpath: RelativePath,
        dup_key_gen: &impl DuplicationKeyGenerator<Key = K>,
    ) -> Result<Self> {
        Self::new2(ty, rpath, dup_key_gen.gen_from_type(ty))
    }

    pub fn next_key(&self, idx: u32, rpath: &RelativePath, dkey: &K) -> Result<TypeKey> {
        let variant = match rpath {
            RelativePath::NsObject(_) | RelativePath::Function(_) => 0,
            _ => match self {
                MapItem::Value(value_type) => {
                    if dkey.is_default() {
                        if value_type.default.is_some() {
                            bail!("default variant already exists");
                        }
                        0
                    } else {
                        if value_type.variants.contains_key(dkey) {
                            bail!("variant with key {:?} already exists", dkey);
                        }
                        value_type.variants.len() as u32 + 1
                    }
                }
                _ => {
                    if dkey.is_default() {
                        0
                    } else {
                        1
                    }
                }
            },
        };
        Ok(TypeKey(idx, variant))
    }

    pub fn merge(&mut self, other: Self) -> Result<()> {
        if let Self::Unset = self {
            *self = other;
        } else {
            match (self, other) {
                (Self::Namespace(_, _), _) | (Self::Function(_), _) => {
                    unreachable!()
                }
                (Self::Value(vtype), Self::Value(source_vtype)) => {
                    vtype.merge(source_vtype)?;
                }
                _ => bail!("cannot merge incompatible enum variant into MapItem"),
            }
        }
        Ok(())
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

    pub fn get_ex(&self, key: TypeKeyEx<G::Key>) -> Option<Type> {
        match self.direct.get(key.0 as usize) {
            Some(MapItem::Unset) => None,
            Some(MapItem::Namespace(ty, _)) => {
                assert!(key.1.is_default());
                Some(Type::Object(Arc::clone(ty)))
            }
            Some(MapItem::Function(f)) => {
                assert!(key.1.is_default());
                Some(Type::Function(Arc::clone(f)))
            }
            Some(MapItem::Value(value_types)) => {
                if key.1.is_default() {
                    value_types.default.as_ref().map(|item| item.ty.clone())
                } else {
                    value_types.variants.get(&key.1).map(|item| item.ty.clone())
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
            MapItem::Unset => MapItem::new(&node, rpath.clone(), &self.dup_key_gen)?,
            MapItem::Namespace(_, _) => {
                bail!("unexpected duplicate namespace type: {:?}", key)
            }
            MapItem::Function(_) => {
                bail!("unexpected duplicate function type: {:?}", key)
            }
            MapItem::Value(mut value_type) => {
                value_type.extend(node, rpath.clone(), &self.dup_key_gen)?;
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
