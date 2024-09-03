// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::PathBuf;

use crate::global_store::Store;
use crate::t::{self, TypeBuilder};
use crate::wit::core::FuncParams;
use crate::wit::{
    self, core::RuntimeId, runtimes::Effect as WitEffect, runtimes::SubstantialOperationData,
    runtimes::SubstantialOperationType,
};
use crate::{
    conversion::runtimes::MaterializerConverter, errors::Result, typegraph::TypegraphContext,
};
use common::typegraph::runtimes::substantial::WorkflowMatData;
use common::typegraph::Materializer;

use serde_json::json;

#[derive(Debug)]
pub enum SubstantialMaterializer {
    Start { workflow: WorkflowMatData },
    Stop { workflow: WorkflowMatData },
    Send { workflow: WorkflowMatData },
}

impl MaterializerConverter for SubstantialMaterializer {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        runtime_id: RuntimeId,
        effect: WitEffect,
    ) -> Result<Materializer> {
        let runtime = c.register_runtime(runtime_id)?;
        let as_index_map = |wf_data: &WorkflowMatData| {
            let WorkflowMatData {
                name,
                file,
                kind,
                deps,
            } = wf_data;
            json!({
                "name": name,
                "file": file,
                "kind": kind,
                "deps": deps,
            })
        };

        let (name, data) = match self {
            SubstantialMaterializer::Start { workflow } => {
                ("start".to_string(), as_index_map(workflow))
            }
            SubstantialMaterializer::Stop { workflow } => {
                ("stop".to_string(), as_index_map(workflow))
            }
            SubstantialMaterializer::Send { workflow } => {
                ("send".to_string(), as_index_map(workflow))
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
        SubstantialOperationType::Start(workflow) => (
            WitEffect::Create(false),
            SubstantialMaterializer::Start {
                workflow: workflow.into(),
            },
            t::string().build()?,
        ),
        SubstantialOperationType::Stop(workflow) => {
            inp.prop("run_id", t::string().build()?);
            (
                WitEffect::Create(false),
                SubstantialMaterializer::Stop {
                    workflow: workflow.into(),
                },
                t::string().build()?,
            )
        }
        SubstantialOperationType::Send(workflow) => {
            let arg = data.func_arg.ok_or("query arg is undefined".to_string())?;
            inp.prop("run_id", t::string().build()?);
            inp.prop("event_name", t::string().build()?);
            inp.prop("payload", arg.into());
            (
                WitEffect::Create(false),
                SubstantialMaterializer::Send {
                    workflow: workflow.into(),
                },
                t::string().build()?,
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

impl From<wit::runtimes::Workflow> for WorkflowMatData {
    fn from(value: wit::runtimes::Workflow) -> Self {
        use common::typegraph::runtimes::substantial;

        Self {
            name: value.name,
            file: PathBuf::from(value.file),
            kind: match value.kind {
                wit::runtimes::WorkflowKind::Python => substantial::WorkflowKind::Python,
                wit::runtimes::WorkflowKind::Deno => substantial::WorkflowKind::Deno,
            },
            deps: value.deps.iter().map(PathBuf::from).collect(),
        }
    }
}
