use std::rc::Rc;

use super::{RefAttrs, RefTarget, TypeRef, DEFAULT_ATTRS};
use crate::errors::{self, Result};
use crate::global_store::Store;
use crate::types::{Type, TypeDef, TypeId};

pub trait ResolveRef {
    fn resolve_ref(&self) -> Result<(TypeDef, Rc<RefAttrs>)>;
    fn try_resolve_ref(&self) -> Result<Option<(TypeDef, Rc<RefAttrs>)>>;
}

impl ResolveRef for TypeRef {
    fn resolve_ref(&self) -> Result<(TypeDef, Rc<RefAttrs>)> {
        match &self.target {
            RefTarget::Direct(type_def) => Ok((
                type_def.clone(),
                self.attributes
                    .clone()
                    .unwrap_or_else(|| DEFAULT_ATTRS.with(|it| it.clone())),
            )),
            RefTarget::Indirect(name) => {
                let type_def = Store::get_type_by_name(name)
                    .ok_or_else(|| errors::unregistered_type_name(name))?;
                Ok((
                    type_def,
                    self.attributes
                        .clone()
                        .unwrap_or_else(|| DEFAULT_ATTRS.with(|it| it.clone())),
                ))
            }
        }
    }

    fn try_resolve_ref(&self) -> Result<Option<(TypeDef, Rc<RefAttrs>)>> {
        match &self.target {
            RefTarget::Direct(type_def) => Ok(Some((
                type_def.clone(),
                self.attributes
                    .clone()
                    .unwrap_or_else(|| DEFAULT_ATTRS.with(|it| it.clone())),
            ))),
            RefTarget::Indirect(name) => {
                let type_def = Store::get_type_by_name(name);
                Ok(type_def.map(|type_def| {
                    (
                        type_def,
                        self.attributes
                            .clone()
                            .unwrap_or_else(|| DEFAULT_ATTRS.with(|it| it.clone())),
                    )
                }))
            }
        }
    }
}

impl ResolveRef for Type {
    fn resolve_ref(&self) -> Result<(TypeDef, Rc<RefAttrs>)> {
        match self {
            Type::Ref(type_ref) => type_ref.resolve_ref(),
            Type::Def(type_def) => Ok((type_def.clone(), RefAttrs::default_rc())),
        }
    }

    fn try_resolve_ref(&self) -> Result<Option<(TypeDef, Rc<RefAttrs>)>> {
        match self {
            Type::Ref(type_ref) => type_ref.try_resolve_ref(),
            Type::Def(type_def) => Ok(Some((type_def.clone(), RefAttrs::default_rc()))),
        }
    }
}

impl ResolveRef for TypeId {
    fn resolve_ref(&self) -> Result<(TypeDef, Rc<RefAttrs>)> {
        self.as_type()?.resolve_ref()
    }

    fn try_resolve_ref(&self) -> Result<Option<(TypeDef, Rc<RefAttrs>)>> {
        self.as_type()?.try_resolve_ref()
    }
}
