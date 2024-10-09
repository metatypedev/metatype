use serde::{Deserialize, Serialize};

use super::{RefAttrs, ResolveRef as _, TypeRef};
use crate::errors::Result;
use crate::types::{Type, TypeDef, TypeDefExt};

pub trait AsId {
    #[allow(clippy::wrong_self_convention)]
    fn as_id(self, composite: bool) -> Result<TypeRef>;
}

impl<T> AsId for T
where
    T: TryInto<Type>,
    crate::errors::TgError: From<<T as TryInto<Type>>::Error>,
{
    #[allow(clippy::wrong_self_convention)]
    fn as_id(self, composite: bool) -> Result<TypeRef> {
        TypeRef::new(
            self.try_into()?,
            RefAttrs::default().as_id(if composite {
                IdKind::Composite
            } else {
                IdKind::Simple
            }),
        )
    }
}

#[derive(Hash, PartialEq, Eq, Clone, Copy, Debug, Serialize, Deserialize)]
pub enum IdKind {
    #[serde(rename = "1")]
    Simple,
    #[serde(rename = "n")]
    Composite,
}

impl TypeRef {
    pub fn id_kind(&self) -> Result<Option<IdKind>> {
        let (type_def, attrs) = self.resolve_ref()?;
        if let Some(as_id) = attrs.as_id {
            match type_def {
                TypeDef::Integer(_) | TypeDef::String(_) => Ok(Some(as_id)),
                TypeDef::Boolean(_) => {
                    if as_id == IdKind::Composite {
                        Ok(Some(as_id))
                    } else {
                        Err(format!(
                            "Type {:?} cannot be used as id unless composite",
                            type_def.variant_name()
                        )
                        .into())
                    }
                }
                _ => Err(format!("Type {:?} cannot be used as id", type_def.variant_name()).into()),
            }
        } else {
            Ok(None)
        }
    }

    pub fn is_id(&self) -> Result<bool> {
        self.id_kind().map(|it| matches!(it, Some(IdKind::Simple)))
    }

    pub fn is_part_of_id(&self) -> Result<bool> {
        self.id_kind()
            .map(|it| matches!(it, Some(IdKind::Composite)))
    }
}
