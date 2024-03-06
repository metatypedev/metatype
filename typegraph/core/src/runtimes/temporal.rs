// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::Materializer;
use crate::errors::Result;
use crate::global_store::Store;
use crate::t;
use crate::t::TypeBuilder;
use crate::wit::core::FuncParams;
use crate::wit::runtimes::Effect as WitEffect;
use crate::wit::runtimes::{RuntimeId, TemporalOperationData, TemporalOperationType};

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
            inp.prop("args", t::list(arg.into()).build()?);
            (
                WitEffect::Create(false),
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
                WitEffect::Update(false),
                TemporalMaterializer::Signal {
                    signal_name: mat_arg,
                },
                t::string().build()?,
            )
        }
        TemporalOperationType::QueryWorkflow => {
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
                WitEffect::Read,
                TemporalMaterializer::Query {
                    query_type: mat_arg,
                },
                t::string().build()?,
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
                WitEffect::Read,
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
