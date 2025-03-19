// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use tg_schema::Policy;

use crate::errors::Result;
use crate::sdk::core::PolicySpec;
use crate::typegraph::TypegraphContext;

use std::hash::Hash as _;

use super::hash::Hashable;

impl crate::sdk::core::Policy {
    pub fn convert(&self, ctx: &mut TypegraphContext) -> Result<Policy> {
        let mat_id = ctx.register_materializer(self.materializer)?;
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
