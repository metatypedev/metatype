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
