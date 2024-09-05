// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    errors::Result,
    runtimes::prisma::context::PrismaContext,
    t::{self, ConcreteTypeBuilder, TypeBuilder},
    types::TypeId,
};

use super::TypeGen;

pub struct Count;

impl TypeGen for Count {
    fn generate(&self, _context: &PrismaContext) -> Result<TypeId> {
        t::optionalx(t::integer())?.named(self.name()).build()
    }

    fn name(&self) -> String {
        "_Count".to_string()
    }
}
