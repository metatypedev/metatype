// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::global_store::Store;
use crate::runtimes::{
    DenoMaterializer, GraphqlMaterializer, Materializer as RawMaterializer, PythonMaterializer,
    Runtime,
};
use crate::wit::core::RuntimeId;
use crate::{typegraph::TypegraphContext, wit::runtimes::Effect as WitEffect};
use common::typegraph::runtimes::deno::DenoRuntimeData;
use common::typegraph::runtimes::graphql::GraphQLRuntimeData;
use common::typegraph::runtimes::KnownRuntime;
use common::typegraph::{runtimes::TGRuntime, Effect, EffectType, Materializer};
use enum_dispatch::enum_dispatch;
use indexmap::IndexMap;
use serde_json::json;

fn effect(typ: EffectType, idempotent: bool) -> Effect {
    Effect {
        effect: Some(typ),
        idempotent,
    }
}

impl From<WitEffect> for Effect {
    fn from(eff: WitEffect) -> Self {
        match eff {
            WitEffect::None => effect(EffectType::None, true),
            WitEffect::Create(idemp) => effect(EffectType::Create, idemp),
            WitEffect::Update(idemp) => effect(EffectType::Update, idemp),
            WitEffect::Delete(idemp) => effect(EffectType::Delete, idemp),
        }
    }
}

#[enum_dispatch(MaterializerData)]
pub trait MaterializerConverter {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        s: &Store,
        runtime_id: RuntimeId,
        effect: WitEffect,
    ) -> Result<common::typegraph::Materializer>;
}

impl MaterializerConverter for DenoMaterializer {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        s: &Store,
        runtime_id: RuntimeId,
        effect: WitEffect,
    ) -> Result<Materializer> {
        use crate::runtimes::DenoMaterializer::*;
        let runtime = c.register_runtime(s, runtime_id)?;
        let (name, data) = match self {
            Inline(inline_fun) => {
                let mut data = IndexMap::new();
                data.insert(
                    "script".to_string(),
                    serde_json::Value::String(format!("var _my_lambda = {}", &inline_fun.code)),
                );
                data.insert(
                    "secrets".to_string(),
                    serde_json::to_value(&inline_fun.secrets).unwrap(),
                );
                ("function".to_string(), data)
            }
            Module(module) => {
                let data = serde_json::from_value(json!({
                    "code": format!("file:{}", module.file),
                }))
                .unwrap();
                ("module".to_string(), data)
            }
            Import(import) => {
                let module_mat = c.register_materializer(s, import.module).unwrap();
                let data = serde_json::from_value(json!({
                    "mod": module_mat,
                    "name": import.func_name,
                    "secrets": import.secrets,
                }))
                .unwrap();
                ("import_function".to_string(), data)
            }
            Predefined(predef) => {
                let data = serde_json::from_value(json!({
                    "name": predef.name,
                }))
                .unwrap();
                ("predefined_function".to_string(), data)
            }
        };
        Ok(Materializer {
            name,
            runtime,
            effect: effect.into(),
            data,
        })
    }
}

impl MaterializerConverter for GraphqlMaterializer {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        s: &Store,
        runtime_id: RuntimeId,
        effect: WitEffect,
    ) -> Result<common::typegraph::Materializer> {
        let runtime = c.register_runtime(s, runtime_id)?;
        let (name, data) = match self {
            GraphqlMaterializer::Query(d) => {
                let mut data = IndexMap::new();
                data.insert("path".to_string(), serde_json::to_value(&d.path).unwrap());
                ("query".to_string(), data)
            }
            GraphqlMaterializer::Mutation(d) => {
                let mut data = IndexMap::new();
                data.insert(
                    "path".to_string(),
                    serde_json::to_value(&d.path).unwrap(), // TODO error
                );
                ("mutation".to_string(), data)
            }
        };
        Ok(Materializer {
            name,
            runtime,
            effect: effect.into(),
            data,
        })
    }
}

impl MaterializerConverter for PythonMaterializer {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        s: &Store,
        runtime_id: RuntimeId,
        effect: WitEffect,
    ) -> Result<Materializer> {
        use crate::runtimes::PythonMaterializer::*;
        let runtime = c.register_runtime(s, runtime_id)?;
        let (name, data) = match self {
            Lambda(lambda_fun) => {
                let mut data = IndexMap::new();
                data.insert(
                    "fn".to_string(),
                    serde_json::to_value(&lambda_fun.code).unwrap(),
                );
                data.insert(
                    "secrets".to_string(),
                    serde_json::to_value(&lambda_fun.secrets).unwrap(),
                );
                ("lambda".to_string(), data)
            }
        };
        Ok(Materializer {
            name,
            runtime,
            effect: effect.into(),
            data,
        })
    }
}

pub fn convert_materializer(
    c: &mut TypegraphContext,
    s: &Store,
    mat: &RawMaterializer,
) -> Result<Materializer> {
    mat.data.convert(c, s, mat.runtime_id, mat.effect)
}

pub fn convert_runtime(
    _c: &mut TypegraphContext,
    _s: &Store,
    runtime: &Runtime,
) -> Result<TGRuntime> {
    use KnownRuntime::*;

    match runtime {
        Runtime::Deno => {
            let data = DenoRuntimeData {
                worker: "default".to_string(),
                permissions: Default::default(),
            };
            Ok(TGRuntime::Known(Deno(data)))
        }
        Runtime::Graphql(d) => {
            let data = GraphQLRuntimeData {
                endpoint: d.endpoint.clone(),
            };
            Ok(TGRuntime::Known(GraphQL(data)))
        }
        Runtime::Python => Ok(TGRuntime::Known(Python)),
    }
}
