// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::Policy;

use crate::errors::Result;
use crate::typegraph::TypegraphContext;

impl crate::wit::core::Policy {
    pub fn convert(&self, ctx: &mut TypegraphContext) -> Result<Policy> {
        let (mat_id, _) = ctx.register_materializer(self.materializer)?;
        Ok(Policy {
            name: self.name.clone(),
            materializer: mat_id,
        })
    }
}
