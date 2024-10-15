use serde::{Deserialize, Serialize};

use crate::{
    errors::Result,
    types::{core::PolicySpec as CorePolicySpec, Type},
};

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

impl From<CorePolicySpec> for PolicySpec {
    fn from(spec: CorePolicySpec) -> Self {
        match spec {
            CorePolicySpec::Simple(id) => PolicySpec::Simple(PolicyId(id)),
            CorePolicySpec::PerEffect(per_effect) => PolicySpec::PerEffect(PolicyPerEffect {
                read: per_effect.read.map(PolicyId),
                create: per_effect.create.map(PolicyId),
                update: per_effect.update.map(PolicyId),
                delete: per_effect.delete.map(PolicyId),
            }),
        }
    }
}

pub trait WithPolicy {
    fn with_policy(self, policy: Vec<PolicySpec>) -> Result<TypeRef>;
}

impl<T> WithPolicy for T
where
    T: TryInto<Type>,
{
    fn with_policy(self, policy: Vec<PolicySpec>) -> Result<TypeRef> {
        RefAttr::Policy(policy)
            .with_target(self.try_into().map_err(|_e| "failed to get type")?)
            .build()
    }
}
