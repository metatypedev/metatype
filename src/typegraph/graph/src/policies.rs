// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{expansion::Registry, interlude::*, runtimes::Materializer};

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

impl PolicySpec {
    pub(crate) fn new(registry: &Registry, specs: &[tg_schema::PolicyIndices]) -> Vec<Self> {
        use tg_schema::PolicyIndices as PI;
        let mut res = Vec::with_capacity(specs.len());
        for spec in specs {
            res.push(match spec {
                PI::Policy(idx) => Self::Simple(registry.policies[*idx as usize].clone()),
                PI::EffectPolicies(pfx) => Self::Conditional(ConditionalPolicy {
                    read: pfx.read.map(|idx| registry.policies[idx as usize].clone()),
                    create: pfx
                        .create
                        .map(|idx| registry.policies[idx as usize].clone()),
                    update: pfx
                        .update
                        .map(|idx| registry.policies[idx as usize].clone()),
                    delete: pfx
                        .delete
                        .map(|idx| registry.policies[idx as usize].clone()),
                }),
            })
        }

        res
    }
}

pub fn convert_policy(materializers: &[Materializer], policy: &tg_schema::Policy) -> Policy {
    let materializer = materializers[policy.materializer as usize].clone();
    Arc::new(PolicyNode {
        name: policy.name.clone().into(),
        materializer,
    })
}
