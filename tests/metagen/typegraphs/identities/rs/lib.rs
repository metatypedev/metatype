// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

#![allow(clippy::large_enum_variant)]

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

impl stubs::RsProxyPrimitives for MyMat {
    fn handle(&self, input: types::PrimitivesArgs, cx: Ctx) -> anyhow::Result<types::Primitives> {
        let resp = cx.host.query(cx.qg.rs_primitives(input).select(all()))?;
        Ok(types::Primitives {
            str: resp.str.unwrap(),
            r#enum: resp.r#enum.unwrap(),
            uuid: resp.uuid.unwrap(),
            email: resp.email.unwrap(),
            ean: resp.ean.unwrap(),
            json: resp.json.unwrap(),
            uri: resp.uri.unwrap(),
            date: resp.date.unwrap(),
            datetime: resp.datetime.unwrap(),
            int: resp.int.unwrap(),
            float: resp.float.unwrap(),
            boolean: resp.boolean.unwrap(),
        })
    }
}
