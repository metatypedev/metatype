// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod fdk;
pub use fdk::*;
pub use metagen_client::prelude::*;

init_mat! {
    hook: || {
        // initialize global stuff here if you need it
        MatBuilder::new()
            // register function handlers here
            .register_handler(stubs::RsPrimitives::erased(MyMat))
            .register_handler(stubs::RsComposites::erased(MyMat))
            .register_handler(stubs::RsCycles::erased(MyMat))
            .register_handler(stubs::RsSimpleCycles::erased(MyMat))
            .register_handler(stubs::RsProxyPrimitives::erased(MyMat))
    }
}

struct MyMat;

impl stubs::RsPrimitives for MyMat {
    fn handle(
        &self,
        input: types::PrimitivesArgsPartial,
        _cx: Ctx,
    ) -> anyhow::Result<types::PrimitivesPartial> {
        Ok(input.data.unwrap())
    }
}

impl stubs::RsComposites for MyMat {
    fn handle(
        &self,
        input: types::CompositesArgsPartial,
        _cx: Ctx,
    ) -> anyhow::Result<types::CompositesPartial> {
        Ok(input.data.unwrap())
    }
}

impl stubs::RsCycles for MyMat {
    fn handle(
        &self,
        input: types::Cycles1ArgsPartial,
        _cx: Ctx,
    ) -> anyhow::Result<types::Cycles1Partial> {
        Ok(input.data.unwrap())
    }
}

impl stubs::RsSimpleCycles for MyMat {
    fn handle(
        &self,
        input: types::SimpleCycles1ArgsPartial,
        _cx: Ctx,
    ) -> anyhow::Result<types::SimpleCycles1Partial> {
        Ok(input.data.unwrap())
    }
}

impl stubs::RsProxyPrimitives for MyMat {
    fn handle(
        &self,
        input: types::PrimitivesArgsPartial,
        cx: Ctx,
    ) -> anyhow::Result<types::PrimitivesPartial> {
        let resp = cx.host.query(cx.qg.rs_primitives(input).select(all()))?;
        Ok(resp)
    }
}
