// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::{
    wasm::{
        self,
        core::{ContextCheck, MaterializerId, Policy as CorePolicy, PolicyId, PolicySpec},
    },
    Result,
};

pub trait AsPolicySpec {
    fn as_policy_spec(&self) -> PolicySpec;
}

#[derive(Debug)]
pub struct Policy {
    id: PolicyId,
    name: String,
}

impl Policy {
    pub fn name(&self) -> &str {
        &self.name
    }

    pub fn public() -> Result<Self> {
        let (id, name) = wasm::with_core(|c, s| c.call_get_public_policy(s))?;

        Ok(Self { id, name })
    }

    pub fn internal() -> Result<Self> {
        let (id, name) = wasm::with_core(|c, s| c.call_get_internal_policy(s))?;

        Ok(Self { id, name })
    }

    pub fn context(key: &str, check: ContextCheck) -> Result<Self> {
        let (id, name) = wasm::with_core(|c, s| c.call_register_context_policy(s, key, &check))?;

        Ok(Self { id, name })
    }

    pub fn new(name: &str, materializer: MaterializerId) -> Result<Self> {
        let data = CorePolicy {
            name: name.to_string(),
            materializer,
        };

        let id = wasm::with_core(|c, s| c.call_register_policy(s, &data))?;

        Ok(Self {
            id,
            name: name.to_string(),
        })
    }

    // TODO
    // pub fn on() {}
}

impl AsPolicySpec for Policy {
    fn as_policy_spec(&self) -> PolicySpec {
        PolicySpec::Simple(self.id)
    }
}

pub use crate::wasm::core::PolicyPerEffect;

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
        self.read = Some(policy.id);
        self
    }

    pub fn create(mut self, policy: &Policy) -> Self {
        self.create = Some(policy.id);
        self
    }

    pub fn update(mut self, policy: &Policy) -> Self {
        self.update = Some(policy.id);
        self
    }

    pub fn delete(mut self, policy: &Policy) -> Self {
        self.delete = Some(policy.id);
        self
    }
}

impl AsPolicySpec for PolicyPerEffect {
    fn as_policy_spec(&self) -> PolicySpec {
        PolicySpec::PerEffect(self.clone())
    }
}
