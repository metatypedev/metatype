// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::expansion::{interlude::*, ConversionMap, MapItem};
use crate::{injection::InjectionNode, FunctionType, Wrap};
use crate::{interlude::*, Type, TypeNodeExt as _};

pub trait DuplicationEngineFactory: Clone {
    type Engine: DuplicationEngine;

    fn create(&self, schema: Arc<tg_schema::Typegraph>) -> Self::Engine;
}

pub trait DupKey: std::hash::Hash + std::fmt::Debug + Eq + Clone {
    fn is_default(&self) -> bool;
}

pub trait DuplicationEngine: Clone {
    type Key: DupKey + 'static;

    fn key_from_type(&self, ty: &Type) -> Self::Key;

    fn key_for_fn_input(&self, fn_type: &FunctionType) -> Self::Key;
    fn key_for_fn_output(&self, fn_type: &FunctionType) -> Self::Key;

    fn shifted_key(&self, ty: &Type, path_seg: &PathSegment) -> Self::Key;
}

#[derive(Default, Clone)]
pub struct DefaultDuplicationEngineFactory;

impl DuplicationEngineFactory for DefaultDuplicationEngineFactory {
    type Engine = DefaultDuplicationEngine;

    fn create(&self, schema: Arc<tg_schema::Typegraph>) -> Self::Engine {
        DefaultDuplicationEngine { schema }
    }
}

#[derive(Default, Clone, Debug, PartialEq, Eq, Hash)]
pub struct DefaultDuplicationKey {
    pub injection: Option<Arc<InjectionNode>>,
}

#[derive(Clone, Debug)]
pub struct DefaultDuplicationEngine {
    pub schema: Arc<tg_schema::Typegraph>,
}

impl DuplicationEngine for DefaultDuplicationEngine {
    type Key = DefaultDuplicationKey;

    fn key_from_type(&self, ty: &Type) -> Self::Key {
        Self::Key {
            injection: if self.schema.is_composite(ty.idx()) {
                ty.injection()
            } else {
                None
            },
        }
    }

    fn shifted_key(&self, ty: &Type, path_seg: &PathSegment) -> Self::Key {
        let dkey = self.key_from_type(ty);
        let inj = dkey
            .injection
            .as_ref()
            .and_then(|inj| path_seg.apply_on_injection(inj));
        Self::Key { injection: inj }
    }

    fn key_for_fn_input(&self, fn_type: &FunctionType) -> Self::Key {
        Self::Key {
            injection: fn_type.injection.clone(),
        }
    }

    fn key_for_fn_output(&self, _fn_type: &FunctionType) -> Self::Key {
        Self::Key { injection: None }
    }
}

impl DupKey for DefaultDuplicationKey {
    fn is_default(&self) -> bool {
        self.injection
            .as_ref()
            .map(|inj| inj.is_empty())
            .unwrap_or(true)
    }
}

pub enum Deduplication {
    /// a previously registered type was found
    Reuse(Type),
    /// did not find a previously registered type matching the duplication key;
    /// need to register a new type
    Register(TypeKey),
}
impl Deduplication {
    fn reuse(ty: Type) -> Self {
        Self::Reuse(ty)
    }
    fn register(idx: u32, variant: u32) -> Self {
        Self::Register(TypeKey(idx, variant))
    }
}

impl<DKG: DuplicationEngine> ConversionMap<DKG> {
    pub fn deduplicate(&self, type_idx: u32, dkey: &DKG::Key) -> Result<Deduplication>
    where
        DKG: DuplicationEngine,
    {
        match self.direct.get(type_idx as usize) {
            Some(MapItem::Unset) => Ok(Deduplication::register(
                type_idx,
                match dkey.is_default() {
                    true => 0,
                    // Duplication key will always be empty for functions and namespaces;
                    // hence, this will always be valid.
                    false => 1,
                },
            )),
            Some(MapItem::Namespace(_, _)) => {
                bail!("unexpected duplicate namespace type: {:?}", type_idx)
            }
            Some(MapItem::Function(fn_ty)) => Ok(Deduplication::reuse(fn_ty.wrap())),
            Some(MapItem::Value(value_type)) => {
                if dkey.is_default() {
                    if let Some(item) = value_type.default.as_ref() {
                        Ok(Deduplication::reuse(item.clone()))
                    } else {
                        Ok(Deduplication::register(type_idx, 0))
                    }
                } else {
                    let found = value_type.variants.get(dkey);
                    if let Some(variant) = found {
                        Ok(Deduplication::reuse(variant.clone()))
                    } else {
                        Ok(Deduplication::register(
                            type_idx,
                            value_type.variants.len() as u32 + 1,
                        ))
                    }
                }
            }
            None => bail!("type index out of bounds: {:?}", type_idx),
        }
    }
}
