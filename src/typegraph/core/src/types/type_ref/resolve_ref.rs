use super::{FlatTypeRef, FlatTypeRefTarget, RefAttrs, TypeRef};
use crate::errors::{self, Result};
use crate::global_store::Store;
use crate::types::{Type, TypeDef, TypeId};

pub trait ResolveRef {
    fn resolve_ref(&self) -> Result<(TypeDef, RefAttrs)>;
    fn try_resolve_ref(&self) -> Result<Option<(TypeDef, RefAttrs)>>;
}

impl FlatTypeRef {
    fn resolve(self) -> Result<(TypeDef, RefAttrs)> {
        match self.target {
            FlatTypeRefTarget::Direct(type_def) => Ok((type_def, self.attributes)),
            FlatTypeRefTarget::Indirect(name) => {
                let type_def = Store::get_type_by_name(&name)
                    .ok_or_else(|| errors::unregistered_type_name(&name))?;
                Ok((type_def, self.attributes))
            }
        }
    }

    fn try_resolve(self) -> Result<Option<(TypeDef, RefAttrs)>> {
        match self.target {
            FlatTypeRefTarget::Direct(type_def) => Ok(Some((type_def, self.attributes))),
            FlatTypeRefTarget::Indirect(name) => {
                let type_def = Store::get_type_by_name(&name);
                Ok(type_def.map(|type_def| (type_def, self.attributes)))
            }
        }
    }
}

impl ResolveRef for TypeRef {
    fn resolve_ref(&self) -> Result<(TypeDef, RefAttrs)> {
        self.flatten().resolve()
    }

    fn try_resolve_ref(&self) -> Result<Option<(TypeDef, RefAttrs)>> {
        self.flatten().try_resolve()
    }
}

impl ResolveRef for Type {
    fn resolve_ref(&self) -> Result<(TypeDef, RefAttrs)> {
        match self {
            Type::Ref(type_ref) => type_ref.resolve_ref(),
            Type::Def(type_def) => Ok((type_def.clone(), vec![])),
        }
    }

    fn try_resolve_ref(&self) -> Result<Option<(TypeDef, RefAttrs)>> {
        match self {
            Type::Ref(type_ref) => type_ref.try_resolve_ref(),
            Type::Def(type_def) => Ok(Some((type_def.clone(), vec![]))),
        }
    }
}

impl ResolveRef for TypeId {
    fn resolve_ref(&self) -> Result<(TypeDef, RefAttrs)> {
        self.as_type()?.resolve_ref()
    }

    fn try_resolve_ref(&self) -> Result<Option<(TypeDef, RefAttrs)>> {
        self.as_type()?.try_resolve_ref()
    }
}
