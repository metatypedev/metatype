// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::Materializer;
use indexmap::IndexMap;

use crate::conversion::runtimes::MaterializerConverter;
use crate::errors::Result;
use crate::t::{self, StructBuilder, TypeBuilder};
use crate::typegraph::TypegraphContext;
use crate::types::TypeId;
use crate::wit::core::RuntimeId;
use crate::wit::runtimes::{Effect, PrismaMigrationOperation};

impl MaterializerConverter for PrismaMigrationOperation {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        runtime_id: RuntimeId,
        effect: Effect,
    ) -> Result<Materializer> {
        let runtime = c.register_runtime(runtime_id)?;

        Ok(Materializer {
            name: match self {
                Self::Diff => "diff",
                Self::Create => "create",
                Self::Apply => "apply",
                Self::Deploy => "deploy",
                Self::Reset => "reset",
            }
            .to_string(),
            runtime,
            effect: effect.into(),
            data: IndexMap::new(),
        })
    }
}

fn inp_base() -> Result<StructBuilder> {
    let mut builder = t::struct_();
    builder
        .propx("typegraph", t::string())?
        .propx("runtime", t::string().optional()?)?;
    Ok(builder)
}

pub fn prisma_diff() -> Result<(TypeId, TypeId)> {
    Ok((
        inp_base()?.propx("script", t::boolean())?.build()?,
        t::struct_()
            .propx("diff", t::string().optional()?)?
            .propx("runtimeName", t::string())?
            .build()?,
    ))
}

pub fn prisma_create() -> Result<(TypeId, TypeId)> {
    Ok((
        inp_base()?
            .propx("name", t::string())?
            .propx("apply", t::boolean())?
            .propx("migrations", t::string().optional()?)?
            .build()?,
        t::struct_()
            .propx("createdMigrationName", t::string())?
            .propx("applyError", t::string().optional()?)?
            .propx("migrations", t::string().optional()?)?
            .propx("runtimeName", t::string())?
            .build()?,
    ))
}

pub fn prisma_apply() -> Result<(TypeId, TypeId)> {
    Ok((
        inp_base()?
            .propx("migrations", t::string().optional()?)?
            .propx("resetDatabase", t::boolean())?
            .build()?,
        t::struct_()
            .propx("databaseReset", t::boolean())?
            .propx("appliedMigrations", t::listx(t::string())?)?
            .build()?,
    ))
}

pub fn prisma_deploy() -> Result<(TypeId, TypeId)> {
    Ok((
        inp_base()?.propx("migrations", t::string())?.build()?,
        t::struct_()
            .propx("migrationCount", t::integer())?
            .propx("appliedMigrations", t::listx(t::string())?)?
            .build()?,
    ))
}

pub fn prisma_reset() -> Result<(TypeId, TypeId)> {
    Ok((inp_base()?.build()?, t::boolean().build()?))
}
