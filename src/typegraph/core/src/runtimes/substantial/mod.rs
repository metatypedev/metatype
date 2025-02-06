// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::conversion::runtimes::MaterializerConverter;
use crate::errors::Result;
use crate::global_store::Store;
use crate::sdk::core::FuncParams;
use crate::sdk::{core::RuntimeId, runtimes::Effect, runtimes::SubstantialOperationData};
use crate::t::{self, TypeBuilder};
use crate::typegraph::TypegraphContext;
use common::typegraph::Materializer;
use serde_json::json;

mod type_utils;

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
    AdvancedFilters,
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
            SubstantialMaterializer::AdvancedFilters => ("advanced_filters".to_string(), json!({})),
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
    let (effect, mat_data, inp_ty, out_ty) = match data {
        SubstantialOperationData::Start(data) => {
            let mut inp = t::struct_();
            inp.prop("name", t::string().build()?);
            inp.prop(
                "kwargs",
                data.func_arg
                    .ok_or("input or output shape is not defined on the typegraph".to_string())?
                    .into(),
            );

            (
                Effect::Create(true),
                SubstantialMaterializer::Start {
                    secrets: data.secrets,
                },
                inp.build()?,
                t::string().build()?,
            )
        }
        SubstantialOperationData::StartRaw(data) => {
            let mut inp = t::struct_();
            inp.prop("name", t::string().build()?);
            inp.prop("kwargs", t::string().format("json").build()?);

            (
                Effect::Create(true),
                SubstantialMaterializer::StartRaw {
                    secrets: data.secrets,
                },
                inp.build()?,
                t::string().build()?,
            )
        }
        SubstantialOperationData::Stop => {
            let mut inp = t::struct_();
            inp.prop("run_id", t::string().build()?);

            (
                Effect::Create(false),
                SubstantialMaterializer::Stop,
                inp.build()?,
                t::list(t::string().build()?).build()?,
            )
        }
        SubstantialOperationData::Send(data) => {
            let event = t::struct_()
                .prop("name", t::string().build()?)
                .prop("payload", data.into())
                .build()?;

            let mut inp = t::struct_();
            inp.prop("run_id", t::string().build()?);
            inp.prop("event", event);

            (
                Effect::Create(false),
                SubstantialMaterializer::Send,
                inp.build()?,
                t::string().build()?,
            )
        }
        SubstantialOperationData::SendRaw => {
            let event = t::struct_()
                .prop("name", t::string().build()?)
                .prop("payload", t::string().format("json").build()?)
                .build()?;

            let mut inp = t::struct_();
            inp.prop("run_id", t::string().build()?);
            inp.prop("event", event);

            (
                Effect::Create(false),
                SubstantialMaterializer::SendRaw,
                inp.build()?,
                t::string().build()?,
            )
        }
        SubstantialOperationData::Resources => {
            let mut inp = t::struct_();
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

            (
                Effect::Read,
                SubstantialMaterializer::Resources,
                inp.build()?,
                out,
            )
        }
        SubstantialOperationData::Results(data) => {
            let mut inp = t::struct_();
            inp.prop("name", t::string().build()?);
            (
                Effect::Read,
                SubstantialMaterializer::Results,
                inp.build()?,
                type_utils::results_op_results_ty(data)?,
            )
        }
        SubstantialOperationData::ResultsRaw => {
            let mut inp = t::struct_();
            inp.prop("name", t::string().build()?);
            (
                Effect::Read,
                SubstantialMaterializer::ResultsRaw,
                inp.build()?,
                type_utils::results_op_results_ty(t::string().format("json").build()?.into())?,
            )
        }
        SubstantialOperationData::InternalLinkParentChild => {
            let mut inp = t::struct_();
            inp.prop("parent_run_id", t::string().build()?);
            inp.prop("child_run_id", t::string().build()?);

            (
                Effect::Create(true),
                SubstantialMaterializer::InternalLinkParentChild,
                inp.build()?,
                t::boolean().build()?,
            )
        }
        SubstantialOperationData::AdvancedFilters => (
            Effect::Read,
            SubstantialMaterializer::AdvancedFilters,
            type_utils::filter_expr_ty()?,
            type_utils::search_results_ty()?,
        ),
    };

    let mat = super::Materializer::substantial(runtime, mat_data, effect);
    let mat_id = Store::register_materializer(mat);
    Ok(FuncParams {
        inp: inp_ty.into(),
        out: out_ty.into(),
        mat: mat_id,
    })
}
