// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    errors::Result,
    runtimes::prisma::context::PrismaContext,
    t::{self, TypeBuilder as _},
    types::TypeId,
};

use super::TypeGen;

pub struct Count;

impl TypeGen for Count {
    fn generate(&self, _context: &PrismaContext) -> Result<TypeId> {
        t::optionalx(t::integer()).build_named(self.name())
    }

    fn name(&self) -> String {
        "_count".to_string()
    }
}
