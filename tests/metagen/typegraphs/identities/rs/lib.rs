// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

mod fdk;
pub use fdk::*;

init_mat! {
    hook: || {
        // initialize global stuff here if you need it
        MatBuilder::new()
            // register function handlers here
            .register_handler(stubs::RsPrimitives::erased(MyMat))
            .register_handler(stubs::RsComposites::erased(MyMat))
            .register_handler(stubs::RsCycles::erased(MyMat))
            .register_handler(stubs::RsSimpleCycles::erased(MyMat))
    }
}

struct MyMat;

impl stubs::RsPrimitives for MyMat {
    fn handle(&self, input: types::PrimitivesArgs, _cx: Ctx) -> anyhow::Result<types::Primitives> {
        Ok(input.data)
    }
}

impl stubs::RsComposites for MyMat {
    fn handle(&self, input: types::CompositesArgs, _cx: Ctx) -> anyhow::Result<types::Composites> {
        Ok(input.data)
    }
}

impl stubs::RsCycles for MyMat {
    fn handle(&self, input: types::Cycles1Args, _cx: Ctx) -> anyhow::Result<types::Cycles1> {
        Ok(input.data)
    }
}

impl stubs::RsSimpleCycles for MyMat {
    fn handle(
        &self,
        input: types::SimpleCycles1Args,
        _cx: Ctx,
    ) -> anyhow::Result<types::SimpleCycles1> {
        Ok(input.data)
    }
}
