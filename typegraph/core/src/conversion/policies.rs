// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::Policy;

use crate::errors::Result;
use crate::typegraph::TypegraphContext;
use crate::wit::core::PolicySpec;

use std::hash::Hash as _;

use super::hash::Hashable;

impl crate::wit::core::Policy {
    pub fn convert(&self, ctx: &mut TypegraphContext) -> Result<Policy> {
        let (mat_id, _) = ctx.register_materializer(self.materializer)?;
        Ok(Policy {
            name: self.name.clone(),
            materializer: mat_id,
        })
    }
}

impl Hashable for PolicySpec {
    fn hash(
        &self,
        hasher: &mut crate::conversion::hash::Hasher,
        _tg: &mut TypegraphContext,
        _runtime_id: Option<u32>,
    ) -> Result<()> {
        match self {
            PolicySpec::Simple(id) => {
                "all:".hash(hasher);
                id.hash(hasher);
            }
            PolicySpec::PerEffect(per_fx) => {
                if let Some(id) = per_fx.read {
                    "read:".hash(hasher);
                    id.hash(hasher);
                }
                if let Some(id) = per_fx.create {
                    "create:".hash(hasher);
                    id.hash(hasher);
                }
                if let Some(id) = per_fx.update {
                    "update:".hash(hasher);
                    id.hash(hasher);
                }
                if let Some(id) = per_fx.delete {
                    "delete:".hash(hasher);
                    id.hash(hasher);
                }
            }
        }

        Ok(())
    }
}
