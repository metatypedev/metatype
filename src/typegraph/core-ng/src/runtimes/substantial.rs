// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::PathBuf;

use common::typegraph::{runtimes::substantial::WorkflowMatData, Materializer};
use serde_json::json;

use crate::types::{
    core::{FuncParams, RuntimeId},
    runtimes::{
        Effect, SubstantialOperationData, SubstantialOperationType, SubstantialRuntimeData,
        Workflow, WorkflowKind,
    },
};

use crate::{
    conversion::runtimes::MaterializerConverter,
    errors::Result,
    global_store::Store,
    t::{self, TypeBuilder},
    typegraph::TypegraphContext,
};

use super::Runtime;

#[derive(Debug)]
pub enum SubstantialMaterializer {
    Start { workflow: WorkflowMatData },
    Stop { workflow: WorkflowMatData },
    Send { workflow: WorkflowMatData },
    Resources { workflow: WorkflowMatData },
    Results { workflow: WorkflowMatData },
}

impl MaterializerConverter for SubstantialMaterializer {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        runtime_id: RuntimeId,
        effect: Effect,
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
            SubstantialMaterializer::Resources { workflow } => {
                ("resources".to_string(), as_index_map(workflow))
            }
            SubstantialMaterializer::Results { workflow } => {
                ("results".to_string(), as_index_map(workflow))
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
        SubstantialOperationType::Start(workflow) => {
            let arg = data.func_arg.ok_or("query arg is undefined".to_string())?;
            inp.prop("kwargs", arg.into());
            (
                Effect::Create(false),
                SubstantialMaterializer::Start {
                    workflow: workflow.into(),
                },
                t::string().build()?,
            )
        }
        SubstantialOperationType::Stop(workflow) => {
            inp.prop("run_id", t::string().build()?);
            (
                Effect::Create(false),
                SubstantialMaterializer::Stop {
                    workflow: workflow.into(),
                },
                t::string().build()?,
            )
        }
        SubstantialOperationType::Send(workflow) => {
            let arg = data.func_arg.ok_or("query arg is undefined".to_string())?;
            inp.prop("run_id", t::string().build()?);
            inp.prop("event", arg.into());
            (
                Effect::Create(false),
                SubstantialMaterializer::Send {
                    workflow: workflow.into(),
                },
                t::string().build()?,
            )
        }
        SubstantialOperationType::Resources(workflow) => {
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
                SubstantialMaterializer::Resources {
                    workflow: workflow.into(),
                },
                out,
            )
        }
        SubstantialOperationType::Results(workflow) => {
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
                Effect::Read,
                SubstantialMaterializer::Results {
                    workflow: workflow.into(),
                },
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

impl From<Workflow> for WorkflowMatData {
    fn from(value: Workflow) -> Self {
        use common::typegraph::runtimes::substantial;

        Self {
            name: value.name,
            file: PathBuf::from(value.file),
            kind: match value.kind {
                WorkflowKind::Python => substantial::WorkflowKind::Python,
                WorkflowKind::Deno => substantial::WorkflowKind::Deno,
            },
            deps: value.deps.iter().map(PathBuf::from).collect(),
        }
    }
}

pub fn register_substantial_runtime(data: SubstantialRuntimeData) -> Result<RuntimeId> {
    Ok(Store::register_runtime(Runtime::Substantial(data.into())))
}

pub fn generate_substantial_operation(
    runtime: RuntimeId,
    data: SubstantialOperationData,
) -> Result<FuncParams> {
    substantial_operation(runtime, data)
}
