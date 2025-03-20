// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{interlude::*, runtimes::Materializer};

#[derive(Debug)]
pub struct PolicyNode {
    pub name: Arc<str>,
    pub materializer: Materializer,
}

pub type Policy = Arc<PolicyNode>;

#[derive(Debug, Clone)]
pub struct ConditionalPolicy {
    pub read: Option<Policy>,
    pub create: Option<Policy>,
    pub update: Option<Policy>,
    pub delete: Option<Policy>,
}

#[derive(Clone, Debug)]
pub enum PolicySpec {
    Simple(Policy),
    Conditional(ConditionalPolicy),
}

pub fn convert_policy(materializers: &[Materializer], policy: &tg_schema::Policy) -> Policy {
    let materializer = materializers[policy.materializer as usize].clone();
    Arc::new(PolicyNode {
        name: policy.name.clone().into(),
        materializer,
    })
}

trait OptionalIndex<I> {
    type Item;
    fn opt_get(&self, index: Option<I>) -> Option<Self::Item>;
}

impl OptionalIndex<u32> for &[Policy] {
    type Item = Policy;
    fn opt_get(&self, index: Option<u32>) -> Option<Policy> {
        index.map(|i| &self[i as usize]).cloned()
    }
}

pub fn convert_policy_spec(policies: &[Policy], spec: &tg_schema::PolicyIndices) -> PolicySpec {
    use tg_schema::PolicyIndices as PI;
    match spec {
        PI::Policy(i) => PolicySpec::Simple(policies[*i as usize].clone()),
        PI::EffectPolicies(pp) => PolicySpec::Conditional(ConditionalPolicy {
            read: policies.opt_get(pp.read),
            create: policies.opt_get(pp.create),
            update: policies.opt_get(pp.update),
            delete: policies.opt_get(pp.delete),
        }),
    }
}
