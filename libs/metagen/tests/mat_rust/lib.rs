// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod gen;
use gen::*;

init_mat! {
    hook: || MatBuilder::new().register_handler(FaasImpl::erased(FaasImpl))
}

struct FaasImpl;

impl MyFaas for FaasImpl {
    fn handle(&self, _input: FaasIn, cx: Ctx) -> anyhow::Result<FaasOut> {
        Ok(FaasOut)
    }
}
