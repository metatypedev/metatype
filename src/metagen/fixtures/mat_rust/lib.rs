// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

#[rustfmt::skip]
mod fdk;
use fdk::stubs::*;
use fdk::types::*;
use fdk::*;

init_mat! {
    hook: || MatBuilder::new().register_handler(FaasImpl::erased(FaasImpl))
}

struct FaasImpl;

impl MyFaas for FaasImpl {
    fn handle(&self, input: MyObj, _cx: Ctx) -> anyhow::Result<MyObj> {
        Ok(input)
    }
}
