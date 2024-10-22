use crate::errors::{Result, TgError};
use crate::types::Type;
use serde::{Deserialize, Serialize};

use super::{RefAttr, TypeRef};

#[derive(Debug, Clone, Serialize, Deserialize, Hash)]
pub struct PolicyId(pub u32);

#[derive(Debug, Clone, Serialize, Deserialize, Hash)]
pub struct PolicyPerEffect {
    pub read: Option<PolicyId>,
    pub create: Option<PolicyId>,
    pub update: Option<PolicyId>,
    pub delete: Option<PolicyId>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Hash)]
pub enum PolicySpec {
    Simple(PolicyId),
    PerEffect(PolicyPerEffect),
}

impl From<crate::wit::core::PolicySpec> for PolicySpec {
    fn from(spec: crate::wit::core::PolicySpec) -> Self {
        match spec {
            crate::wit::core::PolicySpec::Simple(id) => PolicySpec::Simple(PolicyId(id)),
            crate::wit::core::PolicySpec::PerEffect(per_effect) => {
                PolicySpec::PerEffect(PolicyPerEffect {
                    read: per_effect.read.map(PolicyId),
                    create: per_effect.create.map(PolicyId),
                    update: per_effect.update.map(PolicyId),
                    delete: per_effect.delete.map(PolicyId),
                })
            }
        }
    }
}

pub trait WithPolicy {
    fn with_policy(self, policy: Vec<PolicySpec>) -> Result<TypeRef>;
}

impl<T> WithPolicy for T
where
    T: TryInto<Type, Error = TgError>,
{
    fn with_policy(self, policy: Vec<PolicySpec>) -> Result<TypeRef> {
        TypeRef::from_type(self.try_into()?, RefAttr::Policy(policy)).register()
    }
}
