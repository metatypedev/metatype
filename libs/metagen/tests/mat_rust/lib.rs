// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

#[rustfmt::skip]
mod mdk;
use mdk::stubs::*;
use mdk::types::*;
use mdk::*;

init_mat! {
    hook: || MatBuilder::new().register_handler(FaasImpl::erased(FaasImpl))
}

struct FaasImpl;

impl MyFaas for FaasImpl {
    fn handle(&self, input: MyObj, _cx: Ctx) -> anyhow::Result<MyObj> {
        Ok(input)
    }
}
