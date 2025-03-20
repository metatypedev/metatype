// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use tg_schema::InjectionNode;

use crate::{interlude::*, Type, TypeNodeExt as _, Wrap as _};

use super::{ConversionMap, MapItem, RelativePath, TypeKey};

#[derive(Default, Debug, PartialEq, Eq, Hash)]
pub struct DuplicationKey {
    pub injection: Option<InjectionNode>,
}

impl DuplicationKey {
    fn new(ty: &Type) -> Self {
        Self {
            injection: ty.injection().cloned(),
        }
    }

    pub fn from_rpath(schema: &tg_schema::Typegraph, rpath: &RelativePath) -> Self {
        Self {
            injection: rpath.get_injection(schema),
        }
    }

    pub fn is_empty(&self) -> bool {
        self.injection
            .as_ref()
            .map(|inj| inj.is_empty())
            .unwrap_or(true)
    }
}

impl From<&Type> for DuplicationKey {
    fn from(ty: &Type) -> Self {
        Self::new(ty)
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

impl ConversionMap {
    pub fn deduplicate(&self, type_idx: u32, dkey: &DuplicationKey) -> Result<Deduplication> {
        match self.direct.get(type_idx as usize) {
            Some(MapItem::Unset) => Ok(Deduplication::register(
                type_idx,
                match dkey.is_empty() {
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
                if dkey.is_empty() {
                    if let Some(item) = value_type.default.as_ref() {
                        Ok(Deduplication::reuse(item.ty.clone()))
                    } else {
                        Ok(Deduplication::register(type_idx, 0))
                    }
                } else {
                    let found = value_type.variants.get(dkey);
                    if let Some(variant) = found {
                        Ok(Deduplication::reuse(variant.ty.clone()))
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
