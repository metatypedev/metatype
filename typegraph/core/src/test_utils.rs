// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::global_store::with_store;
pub(crate) use crate::wit::{
    core::{
        Core, TypeArray, TypeBase, TypeFloat, TypeFunc, TypeId, TypeInteger, TypeOptional,
        TypeStruct,
    },
    runtimes::{Effect, MaterializerDenoFunc, Runtimes},
};
pub(crate) use crate::Lib;
pub(crate) use crate::TypegraphInitParams;

pub mod t {
    use super::*;
}

#[derive(Default)]
pub struct PrismaLink {
    type_name: String,
    rel_name: Option<String>,
    fkey: Option<bool>,
}

impl PrismaLink {
    pub fn name(mut self, n: impl Into<String>) -> Self {
        self.rel_name = Some(n.into());
        self
    }

    pub fn fkey(mut self, fk: bool) -> Self {
        self.fkey = Some(fk);
        self
    }

    pub fn build(mut self) -> Result<TypeId> {
        let mut proxy = t::proxy(self.type_name);
        if let Some(rel_name) = self.rel_name.take() {
            proxy = proxy.ex("rel_name", rel_name);
        }
        if let Some(fkey) = self.fkey {
            proxy = proxy.ex("fkey", format!("{fkey}"));
        }
        let res = proxy.build();
        eprintln!("proxy: {:?}", res);
        res
    }
}

pub fn prisma_link(type_id: TypeId) -> Result<PrismaLink> {
    // TODO Lib::get_type_name
    let name = with_store(|s| -> Result<_> {
        s.get_type_name(type_id)?
            .map(|s| s.to_owned())
            .ok_or_else(|| "Prisma link target must be named".to_string())
    })?;
    Ok(prisma_linkn(name))
}

pub fn prisma_linkn(name: impl Into<String>) -> PrismaLink {
    PrismaLink {
        type_name: name.into(),
        ..Default::default()
    }
}
