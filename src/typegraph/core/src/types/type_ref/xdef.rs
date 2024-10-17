use super::{AsFlatTypeRef as _, FlatTypeRef, FlatTypeRefTarget, RefAttrs, TypeRef};
use crate::errors::Result;
use crate::global_store::Store;
use crate::typegraph::TypegraphContext;
use crate::types::{Type, TypeDef, TypeDefExt as _, TypeId};
use std::hash::Hash as _;
use std::rc::Rc;

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
        if let Some(name) = self.name.as_deref() {
            "named".hash(hasher);
            name.hash(hasher);
            return Ok(());
        }

        self.type_def.hash_type(hasher, tg)?;
        if !self.attributes.is_empty() {
            "attributes".hash(hasher);
            for attr in self.attributes.iter().rev() {
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
        match self {
            TypeRef::Direct(direct) => Ok(ExtendedTypeDef {
                id: direct.id,
                type_def: direct.target.clone(),
                attributes: vec![direct.attribute.clone()],
                name: None,
            }),
            TypeRef::Indirect(indirect) => {
                let named = Store::get_type_by_name(&indirect.name)
                    .ok_or_else(|| crate::errors::unregistered_type_name(&indirect.name))?;
                let inner = named.target.as_ref().as_xdef()?;
                let mut attributes = inner.attributes;
                attributes.extend(indirect.attributes.iter().cloned());
                Ok(ExtendedTypeDef {
                    id: indirect.id,
                    type_def: inner.type_def,
                    attributes,
                    name: Some(indirect.name.clone()),
                })
            }
            TypeRef::Link(link) => {
                let inner = link.target.as_ref().as_xdef()?;
                let mut attributes = inner.attributes;
                attributes.push(link.attribute.clone());
                Ok(ExtendedTypeDef {
                    id: link.id,
                    type_def: inner.type_def,
                    attributes,
                    name: inner.name.clone(),
                })
            }
            TypeRef::Named(named) => {
                let inner = named.target.as_ref().as_xdef()?;
                Ok(ExtendedTypeDef {
                    id: named.id,
                    type_def: inner.type_def,
                    attributes: inner.attributes,
                    name: Some(named.name.clone()),
                })
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
                attributes.extend(value.attributes.into_iter());
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
