// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::{
    t::{self, TypeBuilder, TypeDef},
    wasm::{
        self,
        core::{MaterializerId, RuntimeId},
        runtimes::{BaseMaterializer, Effect, KvMaterializer, KvRuntimeData},
    },
    Result,
};

#[derive(Debug)]
pub struct KvRuntime {
    id: RuntimeId,
}

impl KvRuntime {
    pub fn new(url: &str) -> Result<Self> {
        let data = KvRuntimeData {
            url: url.to_string(),
        };

        let id = wasm::with_runtimes(|r, s| r.call_register_kv_runtime(s, &data))?;

        Ok(Self { id })
    }

    pub fn set(&self) -> Result<TypeDef> {
        let inp = t::r#struct()
            .prop("key", t::string())?
            .prop("value", t::string())?;
        let out = t::string();
        let mat = self.operation(KvMaterializer::Set, Effect::Update(false))?;

        t::func(inp, out, mat)?.build()
    }

    pub fn get(&self) -> Result<TypeDef> {
        let inp = t::r#struct().prop("key", t::string())?;
        let out = t::string();
        let mat = self.operation(KvMaterializer::Get, Effect::Read)?;

        t::func(inp, out, mat)?.build()
    }

    pub fn delete(&self) -> Result<TypeDef> {
        let inp = t::r#struct().prop("key", t::string())?;
        let out = t::integer();
        let mat = self.operation(KvMaterializer::Delete, Effect::Delete(false))?;

        t::func(inp, out, mat)?.build()
    }

    pub fn keys(&self) -> Result<TypeDef> {
        let inp = t::r#struct().prop("filter", t::string().optional()?)?;
        let out = t::list(t::string())?;
        let mat = self.operation(KvMaterializer::Keys, Effect::Read)?;

        t::func(inp, out, mat)?.build()
    }

    pub fn values(&self) -> Result<TypeDef> {
        let inp = t::r#struct().prop("filter", t::string().optional()?)?;
        let out = t::list(t::string())?;
        let mat = self.operation(KvMaterializer::Values, Effect::Read)?;

        t::func(inp, out, mat)?.build()
    }

    fn operation(&self, kind: KvMaterializer, effect: Effect) -> Result<MaterializerId> {
        let base = BaseMaterializer {
            runtime: self.id,
            effect,
        };

        wasm::with_runtimes(|r, s| r.call_kv_operation(s, base, kind))
    }
}
