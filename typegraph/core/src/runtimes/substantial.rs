// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

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
use common::typegraph::Materializer;

use serde_json::json;

#[derive(Debug)]
pub enum SubstantialMaterializer {
    Python(wit::runtimes::MaterializerWorkflow),
    Start { name: String },
    Stop { name: String },
    Send { name: String },
}

impl MaterializerConverter for SubstantialMaterializer {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        runtime_id: RuntimeId,
        effect: WitEffect,
    ) -> Result<Materializer> {
        let runtime = c.register_runtime(runtime_id)?;
        match self {
            SubstantialMaterializer::Python(wf) => {
                let data = serde_json::from_value(json!({
                    "runtime": runtime,
                    "name": wf.name,
                    "file": wf.file,
                    "deps": wf.deps,
                    "kind": match wf.kind {
                        wit::runtimes::WorkflowKind::Python => "python",
                    }
                }))
                .unwrap();

                Ok(Materializer {
                    name: "register".to_string(),
                    effect: effect.into(),
                    data,
                    runtime,
                })
            }
            SubstantialMaterializer::Start { name } => {
                let data = serde_json::from_value(json!({
                    "name": name,
                }))
                .unwrap();
                Ok(Materializer {
                    name: "start".to_string(),
                    effect: effect.into(),
                    data,
                    runtime,
                })
            }
            SubstantialMaterializer::Stop { name } => {
                let data = serde_json::from_value(json!({
                    "name": name,
                }))
                .unwrap();
                Ok(Materializer {
                    name: "stop".to_string(),
                    effect: effect.into(),
                    data,
                    runtime,
                })
            }
            SubstantialMaterializer::Send { name } => {
                let data = serde_json::from_value(json!({
                    "name": name,
                }))
                .unwrap();
                Ok(Materializer {
                    name: "send".to_string(),
                    effect: effect.into(),
                    data,
                    runtime,
                })
            }
        }
    }
}

pub fn substantial_operation(
    runtime: RuntimeId,
    data: SubstantialOperationData,
) -> Result<FuncParams> {
    let mut inp = t::struct_();
    let (effect, mat_data, out_ty) = match data.operation {
        SubstantialOperationType::Start(name) => {
            inp.prop("name", t::string().build()?);
            (
                WitEffect::Create(false),
                SubstantialMaterializer::Start { name },
                t::string().build()?,
            )
        }
        SubstantialOperationType::Stop(name) => {
            inp.prop("name", t::string().build()?);
            (
                WitEffect::Create(false),
                SubstantialMaterializer::Stop { name },
                t::string().build()?,
            )
        }
        SubstantialOperationType::Send(name) => {
            inp.prop("event", t::string().build()?);
            inp.prop("payload", 0.into());
            (
                WitEffect::Create(false),
                SubstantialMaterializer::Send { name },
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
