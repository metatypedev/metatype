// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod gen;
use gen::stubs::*;
use gen::types::*;
use gen::*;

init_mat! {
    hook: || MatBuilder::new().register_handler(FaasImpl::erased(FaasImpl))
}

struct FaasImpl;

impl MyFaas for FaasImpl {
    fn handle(&self, input: FaasIn, _cx: Ctx) -> anyhow::Result<FaasOut> {
        Ok(FaasOut { hi: input.hello })
    }
}
