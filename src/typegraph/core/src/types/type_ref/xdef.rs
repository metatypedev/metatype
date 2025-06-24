// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{FlatTypeRef, FlatTypeRefTarget, RefAttr, RefAttrs, TypeRef};
use crate::errors::Result;
use crate::global_store::Store;
use crate::typegraph::TypegraphContext;
use crate::types::{Type, TypeDef, TypeDefExt as _, TypeId};
use std::hash::Hash as _;
use std::rc::Rc;

#[derive(Debug)]
pub struct ExtendedTypeDef {
    pub id: TypeId,
    pub type_def: TypeDef,
    pub attributes: RefAttrs,
    pub name: Option<Rc<str>>,
}

impl ExtendedTypeDef {
    pub fn get_owned_name(&self) -> Option<String> {
        self.name.as_deref().map(|s| s.to_string())
    }

    pub fn hash_type(
        &self,
        hasher: &mut crate::conversion::hash::Hasher,
        tg: &mut TypegraphContext,
    ) -> Result<()> {
        if let Some(name) = self.name.as_ref() {
            "named".hash(hasher);
            name.hash(hasher);
            return Ok(());
        }

        self.type_def.hash_type(hasher, tg)?;
        // hashable attributes -- only the ones that affect the type
        let attributes = self
            .attributes
            .iter()
            .filter(|a| matches!(a.as_ref(), RefAttr::Policy(_) | RefAttr::Reduce(_)))
            .collect::<Vec<_>>();
        if !attributes.is_empty() {
            "attributes".hash(hasher);
            for attr in attributes.iter().rev() {
                attr.as_ref().hash(hasher);
            }
        }
        Ok(())
    }
}

pub trait AsTypeDefEx {
    fn as_xdef(&self) -> Result<ExtendedTypeDef>;
}

impl AsTypeDefEx for TypeId {
    fn as_xdef(&self) -> Result<ExtendedTypeDef> {
        self.as_type()?.as_xdef()
    }
}

impl AsTypeDefEx for Type {
    fn as_xdef(&self) -> Result<ExtendedTypeDef> {
        match self {
            Type::Def(d) => d.as_xdef(),
            Type::Ref(r) => r.as_xdef(),
        }
    }
}

impl AsTypeDefEx for TypeDef {
    fn as_xdef(&self) -> Result<ExtendedTypeDef> {
        Ok(ExtendedTypeDef {
            id: self.id(),
            type_def: self.clone(),
            attributes: Default::default(),
            name: None,
        })
    }
}

impl AsTypeDefEx for TypeRef {
    fn as_xdef(&self) -> Result<ExtendedTypeDef> {
        let flat = self.flatten();
        use FlatTypeRefTarget as T;
        match flat.target {
            T::Direct(d) => Ok(ExtendedTypeDef {
                id: flat.id,
                type_def: d.clone(),
                attributes: flat.attributes,
                name: flat.name,
            }),
            T::Indirect(name) => {
                let resolved = Store::get_type_by_name(&name)
                    .ok_or_else(|| crate::errors::unregistered_type_name(&name))?;
                match resolved.target.as_ref() {
                    Type::Def(type_def) => Ok(ExtendedTypeDef {
                        id: flat.id,
                        type_def: type_def.clone(),
                        attributes: flat.attributes,
                        name: Some(name.into()),
                    }),
                    Type::Ref(type_ref) => {
                        let inner = type_ref.as_xdef()?;
                        let mut attributes = inner.attributes;
                        attributes.extend(flat.attributes.iter().cloned());
                        Ok(ExtendedTypeDef {
                            id: flat.id,
                            type_def: inner.type_def,
                            attributes,
                            name: Some(name.into()),
                        })
                    }
                }
            }
        }
    }
}

impl TryFrom<FlatTypeRef> for ExtendedTypeDef {
    type Error = crate::errors::TgError;

    fn try_from(value: FlatTypeRef) -> Result<Self> {
        match value.target {
            FlatTypeRefTarget::Direct(def) => Ok(ExtendedTypeDef {
                id: value.id,
                type_def: def.clone(),
                attributes: value.attributes,
                name: value.name,
            }),
            FlatTypeRefTarget::Indirect(name) => {
                let name_ref = Store::get_type_by_name(&name)
                    .ok_or_else(|| crate::errors::unregistered_type_name(&name))?;
                // TODO inner.name is dropped??
                let inner = name_ref.target.as_ref().as_xdef()?;
                let mut attributes = inner.attributes;
                attributes.extend(value.attributes);
                Ok(ExtendedTypeDef {
                    id: value.id,
                    type_def: inner.type_def,
                    attributes,
                    name: value.name,
                })
            }
        }
    }
}
