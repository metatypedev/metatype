// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::{
    wasm::{
        self,
        core::{ContextCheck, MaterializerId, Policy as CorePolicy, PolicyId, PolicySpec},
    },
    Result,
};

pub trait AsPolicyChain {
    fn as_spec(&self) -> Vec<PolicySpec>;
}

impl<I, P> AsPolicyChain for I
where
    I: IntoIterator<Item = P> + Clone,
    P: AsPolicyChain,
{
    fn as_spec(&self) -> Vec<PolicySpec> {
        self.clone().into_iter().flat_map(|p| p.as_spec()).collect()
    }
}

#[derive(Debug, Clone)]
pub enum Policy {
    Simple(PolicySimple),
    PerEffect(PolicyPerEffect),
}

impl AsPolicyChain for Policy {
    fn as_spec(&self) -> Vec<PolicySpec> {
        match self {
            Policy::Simple(policy) => vec![PolicySpec::Simple(policy.id)],
            Policy::PerEffect(policy) => vec![PolicySpec::PerEffect(policy.clone())],
        }
    }
}

impl AsPolicyChain for &Policy {
    fn as_spec(&self) -> Vec<PolicySpec> {
        (*self).as_spec()
    }
}

impl Policy {
    pub fn public() -> Result<Self> {
        let (id, name) = wasm::with_core(|c, s| c.call_get_public_policy(s))?;

        Ok(Self::Simple(PolicySimple { id, name }))
    }

    pub fn internal() -> Result<Self> {
        let (id, name) = wasm::with_core(|c, s| c.call_get_internal_policy(s))?;

        Ok(Self::Simple(PolicySimple { id, name }))
    }

    pub fn context(key: &str, check: ContextCheck) -> Result<Self> {
        let (id, name) = wasm::with_core(|c, s| c.call_register_context_policy(s, key, &check))?;

        Ok(Self::Simple(PolicySimple { id, name }))
    }

    pub fn new(name: &str, materializer: MaterializerId) -> Result<Self> {
        let data = CorePolicy {
            name: name.to_string(),
            materializer,
        };

        let id = wasm::with_core(|c, s| c.call_register_policy(s, &data))?;

        Ok(Self::Simple(PolicySimple {
            id,
            name: name.to_string(),
        }))
    }

    // TODO
    // pub fn on() {}

    pub fn per_effect(value: PolicyPerEffect) -> Self {
        Self::PerEffect(value)
    }
}

#[derive(Debug, Clone)]
pub struct PolicySimple {
    id: PolicyId,
    name: String,
}

impl PolicySimple {
    pub fn id(&self) -> PolicyId {
        self.id
    }

    pub fn name(&self) -> &str {
        &self.name
    }
}

pub use crate::wasm::core::PolicyPerEffect;

impl Default for PolicyPerEffect {
    fn default() -> Self {
        Self::new()
    }
}

impl PolicyPerEffect {
    pub fn new() -> Self {
        Self {
            read: None,
            create: None,
            update: None,
            delete: None,
        }
    }

    pub fn read(mut self, policy: &Policy) -> Self {
        match policy {
            Policy::Simple(policy) => self.read = Some(policy.id),
            Policy::PerEffect(policy) => self.read = policy.read,
        }

        self
    }

    pub fn update(mut self, policy: &Policy) -> Self {
        match policy {
            Policy::Simple(policy) => self.update = Some(policy.id),
            Policy::PerEffect(policy) => self.update = policy.update,
        }

        self
    }

    pub fn create(mut self, policy: &Policy) -> Self {
        match policy {
            Policy::Simple(policy) => self.create = Some(policy.id),
            Policy::PerEffect(policy) => self.create = policy.create,
        }

        self
    }

    pub fn delete(mut self, policy: &Policy) -> Self {
        match policy {
            Policy::Simple(policy) => self.delete = Some(policy.id),
            Policy::PerEffect(policy) => self.delete = policy.delete,
        }

        self
    }
}
