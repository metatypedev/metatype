// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::conversion::runtimes::MaterializerConverter;
use crate::errors::Result;
use crate::global_store::Store;
use crate::t::{self, TypeBuilder};
use crate::typegraph::TypegraphContext;
use crate::wit::core::FuncParams;
use crate::wit::{
    core::RuntimeId, runtimes::Effect as WitEffect, runtimes::SubstantialOperationData,
    runtimes::SubstantialOperationType,
};
use common::typegraph::Materializer;
use serde_json::json;

#[derive(Debug)]
pub enum SubstantialMaterializer {
    Start,
    Stop,
    Send,
    Resources,
    Results,
}

impl MaterializerConverter for SubstantialMaterializer {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        runtime_id: RuntimeId,
        effect: WitEffect,
    ) -> Result<Materializer> {
        let runtime = c.register_runtime(runtime_id)?;

        let (name, data) = match self {
            SubstantialMaterializer::Start => ("start".to_string(), json!({})),
            SubstantialMaterializer::Stop => ("stop".to_string(), json!({})),
            SubstantialMaterializer::Send => ("send".to_string(), json!({})),
            SubstantialMaterializer::Resources => ("resources".to_string(), json!({})),
            SubstantialMaterializer::Results => ("results".to_string(), json!({})),
        };

        Ok(Materializer {
            name,
            effect: effect.into(),
            data: serde_json::from_value(data).unwrap(),
            runtime,
        })
    }
}

pub fn substantial_operation(
    runtime: RuntimeId,
    data: SubstantialOperationData,
) -> Result<FuncParams> {
    let mut inp = t::struct_();
    let (effect, mat_data, out_ty) = match data.operation {
        SubstantialOperationType::Start => {
            let arg = data.func_arg.ok_or("query arg is undefined".to_string())?;
            inp.prop("name", t::string().build()?);
            inp.prop("kwargs", arg.into());

            (
                WitEffect::Create(false),
                SubstantialMaterializer::Start,
                t::string().build()?,
            )
        }
        SubstantialOperationType::Stop => {
            inp.prop("run_id", t::string().build()?);

            (
                WitEffect::Create(false),
                SubstantialMaterializer::Stop,
                t::string().build()?,
            )
        }
        SubstantialOperationType::Send => {
            let arg = data.func_arg.ok_or("query arg is undefined".to_string())?;
            inp.prop("run_id", t::string().build()?);
            inp.prop("event", arg.into());

            (
                WitEffect::Create(false),
                SubstantialMaterializer::Send,
                t::string().build()?,
            )
        }
        SubstantialOperationType::Resources => {
            inp.prop("name", t::string().build()?);

            let row = t::struct_()
                .prop("run_id", t::string().build()?)
                .prop("started_at", t::string().build()?)
                .build()?;
            // Note: this is per typegate node basis
            // And If the downtime in between interrupts is not negligible this will output nothing
            // as there are no active workers running
            // This feature might be handy for debugging (e.g. long running workers on the typegate it is queried upon)
            let out = t::struct_()
                .prop("count", t::integer().build()?)
                .prop("workflow", t::string().build()?)
                .prop("running", t::list(row).build()?)
                .build()?;

            (WitEffect::Read, SubstantialMaterializer::Resources, out)
        }
        SubstantialOperationType::Results => {
            inp.prop("name", t::string().build()?);

            let out = data
                .func_out
                .ok_or("query output is undefined".to_string())?;

            let count = t::integer().build()?;

            let result = t::struct_()
                .prop("status", t::string().build()?)
                .prop("value", t::optional(out.into()).build()?)
                .build()?;

            let ongoing_runs = t::list(
                t::struct_()
                    .prop("run_id", t::string().build()?)
                    .prop("started_at", t::string().build()?)
                    .build()?,
            )
            .build()?;

            let completed_runs = t::list(
                t::struct_()
                    .prop("run_id", t::string().build()?)
                    .prop("started_at", t::string().build()?)
                    .prop("ended_at", t::string().build()?)
                    .prop("result", result)
                    .build()?,
            )
            .build()?;

            (
                WitEffect::Read,
                SubstantialMaterializer::Results,
                t::struct_()
                    .prop(
                        "ongoing",
                        t::struct_()
                            .prop("count", count)
                            .prop("runs", ongoing_runs)
                            .build()?,
                    )
                    .prop(
                        "completed",
                        t::struct_()
                            .prop("count", count)
                            .prop("runs", completed_runs)
                            .build()?,
                    )
                    .build()?,
            )
        }
    };

    let mat = super::Materializer::substantial(runtime, mat_data, effect);
    let mat_id = Store::register_materializer(mat);
    Ok(FuncParams {
        inp: inp.build()?.into(),
        out: out_ty.into(),
        mat: mat_id,
    })
}
