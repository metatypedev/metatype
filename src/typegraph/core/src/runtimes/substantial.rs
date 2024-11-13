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
    Start { secrets: Vec<String> },
    StartRaw { secrets: Vec<String> },
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
            SubstantialMaterializer::Start { secrets } => {
                ("start".to_string(), json!({ "secrets":secrets }))
            }
            SubstantialMaterializer::StartRaw { secrets } => (
                "start_raw".to_string(),
                json!({
                    "secrets": secrets
                }),
            ),
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
    let (effect, mat_data, out_ty) = match data {
        SubstantialOperationData::Start(data) => {
            inp.prop("name", t::string().build()?);
            inp.prop(
                "kwargs",
                data.func_arg
                    .ok_or("input or output shape is not defined on the typegraph".to_string())?
                    .into(),
            );

            (
                WitEffect::Create(true),
                SubstantialMaterializer::Start {
                    secrets: data.secrets,
                },
                t::string().build()?,
            )
        }
        SubstantialOperationData::StartRaw(data) => {
            inp.prop("name", t::string().build()?);
            inp.prop("kwargs", t_json_string()?.into());

            (
                WitEffect::Create(true),
                SubstantialMaterializer::StartRaw {
                    secrets: data.secrets,
                },
                t::string().build()?,
            )
        }
        SubstantialOperationData::Stop => {
            inp.prop("run_id", t::string().build()?);

            (
                Effect::Create(false),
                SubstantialMaterializer::Stop,
                t::list(t::string().build()?).build()?,
            )
        }
        SubstantialOperationData::Send(data) => {
            let event = t::struct_()
                .prop("name", t::string().build()?)
                .prop("payload", data.into())
                .build()?;

            inp.prop("run_id", t::string().build()?);
            inp.prop("event", event);

            (
                WitEffect::Create(false),
                SubstantialMaterializer::Send,
                t::string().build()?,
            )
        }
        SubstantialOperationData::SendRaw => {
            let event = t::struct_()
                .prop("name", t::string().build()?)
                .prop("payload", t_json_string()?.into())
                .build()?;

            inp.prop("run_id", t::string().build()?);
            inp.prop("event", event);

            (
                WitEffect::Create(false),
                SubstantialMaterializer::SendRaw,
                t::string().build()?,
            )
        }
        SubstantialOperationData::Resources => {
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
        SubstantialOperationData::Results(data) => {
            inp.prop("name", t::string().build()?);
            (
                WitEffect::Read,
                SubstantialMaterializer::Results,
                results_op_results_ty(data)?,
            )
        }
        SubstantialOperationData::ResultsRaw => {
            inp.prop("name", t::string().build()?);
            (
                WitEffect::Read,
                SubstantialMaterializer::ResultsRaw,
                results_op_results_ty(t_json_string()?)?,
            )
        }
        SubstantialOperationData::InternalLinkParentChild => {
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

fn t_json_string() -> Result<u32> {
    t::string()
        .build()
        .and_then(|r| {
            r.with_config(json!({
                "format": "json"
            }))
        })
        .map(|r| r.id().into())
}

fn results_op_results_ty(out: u32) -> Result<crate::types::TypeId> {
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
        .build()
}
