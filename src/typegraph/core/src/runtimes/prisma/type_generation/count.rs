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
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        t::optionalx(t::integer()).build_named_p(self.name(context)?)
    }

    fn name(&self, _context: &PrismaContext) -> Result<String> {
        Ok("_count".to_string())
    }
}
