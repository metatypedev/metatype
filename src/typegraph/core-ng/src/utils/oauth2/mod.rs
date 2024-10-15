// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod std;

use crate::{
    global_store::Store,
    runtimes::{DenoMaterializer, Materializer},
    t,
    types::{
        runtimes::{Effect, MaterializerDenoFunc},
        TypeId,
    },
};

use crate::errors::TgError;

pub struct OAuth2Profiler {
    pub input: TypeId,
    pub output: TypeId,
    pub js_code: String,
}

impl TryInto<TypeId> for OAuth2Profiler {
    type Error = TgError;

    fn try_into(self) -> Result<TypeId, Self::Error> {
        let deno_mat = DenoMaterializer::Inline(MaterializerDenoFunc {
            code: self.js_code,
            secrets: vec![],
        });
        let mat = Materializer::deno(deno_mat, Effect::Read);
        t::func(self.input, self.output, Store::register_materializer(mat))
    }
}
