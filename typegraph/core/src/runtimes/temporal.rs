// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::Materializer;
use crate::errors::Result;
use crate::global_store::with_store_mut;
use crate::t;
use crate::t::TypeBuilder;
use crate::wit::core::TypeFunc;
use crate::wit::runtimes::Effect as WitEffect;
use crate::wit::runtimes::{RuntimeId, TemporalOperationData, TemporalOperationType};

#[derive(Debug)]
pub enum TemporalMaterializer {
    Start { workflow_type: String },
    Signal { signal_name: String },
    Query { query_type: String },
    Describe,
}

pub fn temporal_operation(runtime: RuntimeId, data: TemporalOperationData) -> Result<TypeFunc> {
    let mut inp = t::struct_();
    let (effect, mat_data) = match data.operation {
        TemporalOperationType::StartWorkflow => {
            let arg = data
                .func_arg
                .ok_or("workflow arg is undefined".to_string())?;
            let mat_arg = data
                .mat_arg
                .ok_or("materializer arg is undefined".to_string())?;
            inp.prop("workflow_id", t::string().build()?);
            inp.prop("args", t::array(arg.into()).build()?);
            (
                WitEffect::Create(false),
                TemporalMaterializer::Start {
                    workflow_type: mat_arg,
                },
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
            inp.prop("args", t::array(arg.into()).build()?);
            (
                WitEffect::Update(false),
                TemporalMaterializer::Signal {
                    signal_name: mat_arg,
                },
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
            inp.prop("args", t::array(arg.into()).build()?);
            (
                WitEffect::None,
                TemporalMaterializer::Query {
                    query_type: mat_arg,
                },
            )
        }
        TemporalOperationType::DescribeWorkflow => {
            inp.prop("workflow_id", t::string().build()?);
            inp.prop("run_id", t::string().build()?);
            (WitEffect::None, TemporalMaterializer::Describe)
        }
    };

    let mat = Materializer::temporal(runtime, mat_data, effect);
    let mat_id = with_store_mut(|s| s.register_materializer(mat));

    Ok(TypeFunc {
        inp: inp.build()?.into(),
        out: t::string().build()?.into(),
        mat: mat_id,
    })
}
