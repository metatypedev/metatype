use serde::{Deserialize, Serialize};

use super::{ExtendedTypeDef, FindAttribute as _, RefAttr, TypeRef};
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
        TypeRef::from_type(
            self.try_into()?,
            RefAttr::AsId(if composite {
                IdKind::Composite
            } else {
                IdKind::Simple
            }),
        )
        .register()
    }
}

#[derive(Hash, PartialEq, Eq, Clone, Copy, Debug, Serialize, Deserialize)]
pub enum IdKind {
    #[serde(rename = "1")]
    Simple,
    #[serde(rename = "n")]
    Composite,
}

impl ExtendedTypeDef {
    pub fn id_kind(&self) -> Result<Option<IdKind>> {
        if let Some(as_id) = self.attributes.find_id_kind() {
            match &self.type_def {
                TypeDef::Integer(_) | TypeDef::String(_) => Ok(Some(as_id)),
                TypeDef::Boolean(_) => {
                    if as_id == IdKind::Composite {
                        Ok(Some(as_id))
                    } else {
                        Err(format!(
                            "Type {:?} cannot be used as id unless composite",
                            self.type_def.variant_name()
                        )
                        .into())
                    }
                }
                _ => Err(format!(
                    "Type {:?} cannot be used as id",
                    self.type_def.variant_name()
                )
                .into()),
            }
        } else {
            Ok(None)
        }
    }

    // pub fn is_id(&self) -> Result<bool> {
    //     self.id_kind().map(|it| matches!(it, Some(IdKind::Simple)))
    // }
    //
    // pub fn is_part_of_id(&self) -> Result<bool> {
    //     self.id_kind()
    //         .map(|it| matches!(it, Some(IdKind::Composite)))
    // }
}
