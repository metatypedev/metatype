// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::{
    t::{TypeBuilder, TypeDef},
    wasm::{
        self,
        core::RuntimeId,
        runtimes::{Effect, PrismaLinkData, PrismaRuntimeData},
        utils::TypeId,
    },
    Result,
};

#[derive(Debug)]
pub struct PrismaRuntime {
    id: RuntimeId,
    _name: String,
    _connection: String,
}

impl PrismaRuntime {
    pub fn new(name: &str, connection: &str) -> Result<Self> {
        let data = PrismaRuntimeData {
            name: name.to_string(),
            connection_string_secret: connection.to_string(),
        };

        let id = wasm::with_runtimes(|r, s| r.call_register_prisma_runtime(s, &data))?;

        Ok(Self {
            id,
            _name: data.name,
            _connection: data.connection_string_secret,
        })
    }

    pub fn find_unique<T: TypeBuilder>(&self, model: T) -> Result<TypeDef> {
        wasm::with_runtimes(|r, s| r.call_prisma_find_unique(s, self.id, model.into_id()?)).build()
    }

    pub fn find_many<T: TypeBuilder>(&self, model: T) -> Result<TypeDef> {
        wasm::with_runtimes(|r, s| r.call_prisma_find_many(s, self.id, model.into_id()?)).build()
    }

    pub fn find_first<T: TypeBuilder>(&self, model: T) -> Result<TypeDef> {
        wasm::with_runtimes(|r, s| r.call_prisma_find_first(s, self.id, model.into_id()?)).build()
    }

    pub fn aggregate<T: TypeBuilder>(&self, model: T) -> Result<TypeDef> {
        wasm::with_runtimes(|r, s| r.call_prisma_aggregate(s, self.id, model.into_id()?)).build()
    }

    pub fn count<T: TypeBuilder>(&self, model: T) -> Result<TypeDef> {
        wasm::with_runtimes(|r, s| r.call_prisma_count(s, self.id, model.into_id()?)).build()
    }

    pub fn group_by<T: TypeBuilder>(&self, model: T) -> Result<TypeDef> {
        wasm::with_runtimes(|r, s| r.call_prisma_group_by(s, self.id, model.into_id()?)).build()
    }

    pub fn create<T: TypeBuilder>(&self, model: T) -> Result<TypeDef> {
        wasm::with_runtimes(|r, s| r.call_prisma_create_one(s, self.id, model.into_id()?)).build()
    }

    pub fn create_many<T: TypeBuilder>(&self, model: T) -> Result<TypeDef> {
        wasm::with_runtimes(|r, s| r.call_prisma_create_many(s, self.id, model.into_id()?)).build()
    }

    pub fn update<T: TypeBuilder>(&self, model: T) -> Result<TypeDef> {
        wasm::with_runtimes(|r, s| r.call_prisma_update_one(s, self.id, model.into_id()?)).build()
    }

    pub fn update_many<T: TypeBuilder>(&self, model: T) -> Result<TypeDef> {
        wasm::with_runtimes(|r, s| r.call_prisma_update_many(s, self.id, model.into_id()?)).build()
    }

    pub fn delete<T: TypeBuilder>(&self, model: T) -> Result<TypeDef> {
        wasm::with_runtimes(|r, s| r.call_prisma_delete_one(s, self.id, model.into_id()?)).build()
    }

    pub fn delete_many<T: TypeBuilder>(&self, model: T) -> Result<TypeDef> {
        wasm::with_runtimes(|r, s| r.call_prisma_delete_many(s, self.id, model.into_id()?)).build()
    }

    pub fn upsert<T: TypeBuilder>(&self, model: T) -> Result<TypeDef> {
        wasm::with_runtimes(|r, s| r.call_prisma_upsert_one(s, self.id, model.into_id()?)).build()
    }

    pub fn execute<T: TypeBuilder>(
        &self,
        query: &str,
        param: T,
        effect: Effect,
    ) -> Result<TypeDef> {
        wasm::with_runtimes(|r, s| {
            r.call_prisma_execute(s, self.id, query, param.into_id()?, effect)
        })
        .build()
    }

    pub fn query_raw<P, O>(&self, query: &str, param: P, out: O) -> Result<TypeDef>
    where
        P: TypeBuilder,
        O: TypeBuilder,
    {
        wasm::with_runtimes(|r, s| {
            r.call_prisma_query_raw(s, self.id, query, Some(param.into_id()?), out.into_id()?)
        })
        .build()
    }

    pub fn link<T: TypeBuilder>(model: T) -> Result<PrismaLinkBuilder> {
        Ok(PrismaLinkBuilder {
            target: model.into_id()?,
            ..Default::default()
        })
    }
}

#[derive(Debug, Default, Clone)]
pub struct PrismaLinkBuilder {
    target: TypeId,
    name: Option<String>,
    fkey: Option<bool>,
    unique: Option<bool>,
    field: Option<String>,
}

impl PrismaLinkBuilder {
    pub fn name(mut self, name: &str) -> Self {
        self.name = Some(name.to_string());
        self
    }

    pub fn fkey(mut self) -> Self {
        self.fkey = Some(true);
        self
    }

    pub fn unique(mut self) -> Self {
        self.unique = Some(true);
        self
    }

    pub fn field(mut self, field: &str) -> Self {
        self.field = Some(field.to_string());
        self
    }
}

impl TypeBuilder for PrismaLinkBuilder {
    fn build(self) -> Result<TypeDef> {
        let data = PrismaLinkData {
            target_type: self.target,
            relationship_name: self.name,
            foreign_key: self.fkey,
            target_field: self.field,
            unique: self.unique,
        };

        wasm::with_runtimes(|r, s| r.call_prisma_link(s, &data)).build()
    }
}
