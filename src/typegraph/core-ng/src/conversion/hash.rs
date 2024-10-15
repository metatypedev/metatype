// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::typegraph::TypegraphContext;
pub use seahash::SeaHasher as Hasher;

pub trait Hashable {
    fn hash(
        &self,
        hasher: &mut Hasher,
        tg: &mut TypegraphContext,
        runtime_id: Option<u32>,
    ) -> Result<()>;
}
