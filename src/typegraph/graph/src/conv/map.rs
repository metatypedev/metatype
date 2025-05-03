// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use indexmap::IndexMap;

use crate::interlude::*;
use crate::{Arc, FunctionType, ObjectType, Type, TypeNodeExt as _};

use super::dedup::{DupKey, DuplicationKeyGenerator};
use super::key::TypeKeyEx;
use super::{RelativePath, TypeKey};

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub enum ValueTypeKind {
    Input,
    Output,
}

#[derive(Debug)]
pub struct ValueType<K: DupKey> {
    pub default: Option<Type>,
    // duplication
    pub variants: IndexMap<K, Type>,
}

impl<K: DupKey> ValueType<K> {
    pub fn iter(&self, idx: u32) -> impl Iterator<Item = (TypeKey, &Type)> {
        self.default
            .iter()
            .map(move |i| (TypeKey(idx, 0), i))
            .chain(
                self.variants
                    .values()
                    .enumerate()
                    .map(move |(i, v)| (TypeKey(idx, i as u32 + 1), v)),
            )
    }

    fn merge(&mut self, other: Self) -> Result<()> {
        if self.default.is_none() {
            if other.default.is_some() && !other.variants.is_empty() {
                bail!("cannot merge more than a single item into ValueType")
            }
            self.default = other.default;
        }
        match other.variants.len() {
            0 => {}
            1 => {
                let (dkey, item) = other.variants.into_iter().next().unwrap();
                if self.variants.contains_key(&dkey) {
                    bail!("ValueType::variants already has item with key {dkey:?}")
                }
                if (item.key().1 as usize) != self.variants.len() + 1 {
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
    pub fn get(&self, variant_idx: u32) -> Option<&Type> {
        let variant_idx = variant_idx as usize;
        if variant_idx == 0 {
            self.default.as_ref()
        } else {
            self.variants
                .get_index(variant_idx - 1)
                .map(|(_, item)| item)
        }
    }

    pub fn find(&self, key: &K) -> Option<&Type> {
        if key.is_default() {
            self.default.as_ref()
        } else {
            self.variants.get(key)
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

    pub fn new(ty: &Type, rpath: RelativePath, dkey: K) -> Result<Self> {
        Ok(match &rpath {
            RelativePath::Function(_) => MapItem::Function(ty.assert_func()?.clone()),
            RelativePath::NsObject(path) => {
                MapItem::Namespace(ty.assert_object()?.clone(), path.clone())
            }
            RelativePath::Input(_) => {
                // TODO non-composite types always have a single variant; so `dkey` won't be
                // considered
                if dkey.is_default() {
                    MapItem::Value(ValueType {
                        default: Some(ty.clone()),
                        variants: Default::default(),
                    })
                } else {
                    let variants = std::iter::once((dkey, ty.clone())).collect();
                    MapItem::Value(ValueType {
                        default: None,
                        variants,
                    })
                }
            }
            // TODO
            RelativePath::Output(_) => MapItem::Value(ValueType {
                default: Some(ty.clone()),
                variants: Default::default(),
            }),
        })
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
    pub direct: Vec<MapItem<G::Key>>,
}

impl<G: DuplicationKeyGenerator> ConversionMap<G> {
    pub fn new(schema: &tg_schema::Typegraph) -> Self {
        let type_count = schema.types.len();
        let mut direct = Vec::with_capacity(type_count);
        direct.resize_with(type_count, || MapItem::Unset);
        Self { direct }
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
                    value_types.default.as_ref().map(|item| item.clone())
                } else {
                    let index = ordinal - 1;
                    value_types
                        .variants
                        .get_index(index)
                        .map(|(_, item)| item.clone())
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
                    value_types.default.as_ref().map(|item| item.clone())
                } else {
                    value_types.variants.get(&key.1).map(|item| item.clone())
                }
            }
            None => None, // unreachable
        }
    }
}
