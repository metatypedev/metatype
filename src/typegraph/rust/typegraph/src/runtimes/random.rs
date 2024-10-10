// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::{
    t::{self, TypeBuilder, TypeDef},
    wasm::{
        self,
        core::RuntimeId,
        runtimes::{BaseMaterializer, Effect, MaterializerRandom, RandomRuntimeData},
    },
    Result,
};

#[derive(Debug)]
pub struct RandomRuntime {
    id: RuntimeId,
}

impl RandomRuntime {
    pub fn new(seed: Option<u32>, reset: Option<&str>) -> Result<Self> {
        let data = RandomRuntimeData {
            seed,
            reset: reset.map(|r| r.to_string()),
        };

        let id = wasm::with_runtimes(|r, s| r.call_register_random_runtime(s, &data))?;

        Ok(RandomRuntime { id })
    }

    pub fn gen<T: TypeBuilder>(&self, out: T) -> Result<TypeDef> {
        let base = BaseMaterializer {
            runtime: self.id,
            effect: Effect::Read,
        };
        let mat = MaterializerRandom { runtime: self.id };
        let mat_id = wasm::with_runtimes(|r, s| r.call_create_random_mat(s, base, mat))?;

        t::funcb(t::r#struct(), out, mat_id)
    }
}
