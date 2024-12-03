// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::Materializer;
use crate::errors::Result;
use crate::global_store::Store;
use crate::sdk::core::{FuncParams, RuntimeId};
use crate::sdk::runtimes::Effect;
use crate::sdk::runtimes::{TemporalOperationData, TemporalOperationType};
use crate::t;
use crate::t::TypeBuilder;

#[derive(Debug)]
pub enum TemporalMaterializer {
    Start { workflow_type: String },
    Signal { signal_name: String },
    Query { query_type: String },
    Describe,
}

pub fn temporal_operation(runtime: RuntimeId, data: TemporalOperationData) -> Result<FuncParams> {
    let mut inp = t::struct_();
    let (effect, mat_data, out_ty) = match data.operation {
        TemporalOperationType::StartWorkflow => {
            let arg = data
                .func_arg
                .ok_or("workflow arg is undefined".to_string())?;
            let mat_arg = data
                .mat_arg
                .ok_or("materializer arg is undefined".to_string())?;
            inp.prop("workflow_id", t::string().build()?);
            inp.prop("task_queue", t::string().build()?);
            inp.prop("args", t::list(arg.into()).build()?);
            (
                Effect::Create(false),
                TemporalMaterializer::Start {
                    workflow_type: mat_arg,
                },
                t::string().build()?,
            )
        }
        TemporalOperationType::SignalWorkflow => {
            let arg = data
                .func_arg
                .ok_or("workflow arg is undefined".to_string())?;
            let mat_arg = data
                .mat_arg
                .ok_or("materializer arg is undefined".to_string())?;
            inp.prop("workflow_id", t::string().build()?);
            inp.prop("run_id", t::string().build()?);
            inp.prop("args", t::list(arg.into()).build()?);
            (
                Effect::Update(false),
                TemporalMaterializer::Signal {
                    signal_name: mat_arg,
                },
                t::boolean().build()?,
            )
        }
        TemporalOperationType::QueryWorkflow => {
            let arg = data.func_arg.ok_or("query arg is undefined".to_string())?;
            let out =
                crate::types::TypeId(data.func_out.ok_or("query out is undefined".to_string())?);
            let mat_arg = data
                .mat_arg
                .ok_or("materializer arg is undefined".to_string())?;
            inp.prop("workflow_id", t::string().build()?);
            inp.prop("run_id", t::string().build()?);
            inp.prop("args", t::list(arg.into()).build()?);
            (
                Effect::Read,
                TemporalMaterializer::Query {
                    query_type: mat_arg,
                },
                out,
            )
        }
        TemporalOperationType::DescribeWorkflow => {
            inp.prop("workflow_id", t::string().build()?);
            inp.prop("run_id", t::string().build()?);
            let mut out_ty = t::struct_();
            out_ty.props([
                (
                    "start_time".to_string(),
                    t::optional(t::integer().build()?).build()?,
                ),
                (
                    "close_time".to_string(),
                    t::optional(t::integer().build()?).build()?,
                ),
                (
                    "state".to_string(),
                    t::optional(t::integer().build()?).build()?,
                ),
            ]);
            (
                Effect::Read,
                TemporalMaterializer::Describe,
                out_ty.build()?,
            )
        }
    };

    let mat = Materializer::temporal(runtime, mat_data, effect);
    let mat_id = Store::register_materializer(mat);
    Ok(FuncParams {
        inp: inp.build()?.into(),
        out: out_ty.into(),
        mat: mat_id,
    })
}
