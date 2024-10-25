// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::conversion::runtimes::MaterializerConverter;
use crate::errors::Result;
use crate::global_store::Store;
use crate::sdk::core::FuncParams;
use crate::sdk::{
    core::RuntimeId, runtimes::Effect, runtimes::SubstantialOperationData,
    runtimes::SubstantialOperationType,
};
use crate::t::{self, TypeBuilder};
use crate::typegraph::TypegraphContext;
use crate::types::WithRuntimeConfig;
use common::typegraph::Materializer;
use serde_json::json;

#[derive(Debug)]
pub enum SubstantialMaterializer {
    Start,
    StartRaw,
    Stop,
    Send,
    SendRaw,
    Resources,
    Results,
    ResultsRaw,
    InternalLinkParentChild,
}

impl MaterializerConverter for SubstantialMaterializer {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        runtime_id: RuntimeId,
        effect: Effect,
    ) -> Result<Materializer> {
        let runtime = c.register_runtime(runtime_id)?;

        let (name, data) = match self {
            SubstantialMaterializer::Start => ("start".to_string(), json!({})),
            SubstantialMaterializer::StartRaw => ("start_raw".to_string(), json!({})),
            SubstantialMaterializer::Stop => ("stop".to_string(), json!({})),
            SubstantialMaterializer::Send => ("send".to_string(), json!({})),
            SubstantialMaterializer::SendRaw => ("send_raw".to_string(), json!({})),
            SubstantialMaterializer::Resources => ("resources".to_string(), json!({})),
            SubstantialMaterializer::Results => ("results".to_string(), json!({})),
            SubstantialMaterializer::ResultsRaw => ("results_raw".to_string(), json!({})),
            SubstantialMaterializer::InternalLinkParentChild => {
                ("internal_link_parent_child".to_string(), json!({}))
            }
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
        SubstantialOperationType::Start | SubstantialOperationType::StartRaw => {
            let (mat, flag) = match data.operation {
                SubstantialOperationType::Start => (SubstantialMaterializer::Start, true),
                SubstantialOperationType::StartRaw => (SubstantialMaterializer::StartRaw, false),
                _ => unreachable!(),
            };

            inp.prop("name", t::string().build()?);
            inp.prop(
                "kwargs",
                use_arg_or_json_string(data.func_arg, flag)?.into(),
            );

            (Effect::Create(true), mat, t::string().build()?)
        }
        SubstantialOperationType::Stop => {
            inp.prop("run_id", t::string().build()?);

            (
                Effect::Create(false),
                SubstantialMaterializer::Stop,
                t::list(t::string().build()?).build()?,
            )
        }
        SubstantialOperationType::Send | SubstantialOperationType::SendRaw => {
            let (mat, flag) = match data.operation {
                SubstantialOperationType::Send => (SubstantialMaterializer::Send, true),
                SubstantialOperationType::SendRaw => (SubstantialMaterializer::SendRaw, false),
                _ => unreachable!(),
            };

            let event = t::struct_()
                .prop("name", t::string().build()?)
                .prop(
                    "payload",
                    use_arg_or_json_string(data.func_arg, flag)?.into(),
                )
                .build()?;

            inp.prop("run_id", t::string().build()?);
            inp.prop("event", event);

            (Effect::Create(false), mat, t::string().build()?)
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

            (Effect::Read, SubstantialMaterializer::Resources, out)
        }
        SubstantialOperationType::Results | SubstantialOperationType::ResultsRaw => {
            let (mat, flag) = match data.operation {
                SubstantialOperationType::Results => (SubstantialMaterializer::Results, true),
                SubstantialOperationType::ResultsRaw => {
                    (SubstantialMaterializer::ResultsRaw, false)
                }
                _ => unreachable!(),
            };

            inp.prop("name", t::string().build()?);
            let out = use_arg_or_json_string(data.func_out, flag)?;

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
                Effect::Read,
                mat,
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
        SubstantialOperationType::InternalLinkParentChild => {
            inp.prop("parent_run_id", t::string().build()?);
            inp.prop("child_run_id", t::string().build()?);

            (
                Effect::Create(true),
                SubstantialMaterializer::InternalLinkParentChild,
                t::boolean().build()?,
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

fn use_arg_or_json_string(arg: Option<u32>, flag: bool) -> Result<u32> {
    if flag {
        let arg = arg.ok_or("input or output shape is not defined on the typegraph".to_string())?;
        return Ok(arg);
    };

    t::string()
        .build()
        .and_then(|r| {
            r.with_config(json!({
                "format": "json"
            }))
        })
        .map(|r| r.id().into())
}
