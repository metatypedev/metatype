// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::global_store::Store;
use crate::runtimes::prisma::{with_prisma_runtime, ConversionContext};
use crate::runtimes::{
    DenoMaterializer, GraphqlMaterializer, Materializer as RawMaterializer, PythonMaterializer,
    RandomMaterializer, Runtime, WasiMaterializer,
};
use crate::wit::core::RuntimeId;
use crate::wit::runtimes::{HttpMethod, MaterializerHttpRequest};
use crate::{typegraph::TypegraphContext, wit::runtimes::Effect as WitEffect};
use common::typegraph::runtimes::deno::DenoRuntimeData;
use common::typegraph::runtimes::graphql::GraphQLRuntimeData;
use common::typegraph::runtimes::http::HTTPRuntimeData;
use common::typegraph::runtimes::prisma::{PrismaRuntimeData, Relationship};
use common::typegraph::runtimes::python::PythonRuntimeData;
use common::typegraph::runtimes::random::RandomRuntimeData;
use common::typegraph::runtimes::wasmedge::WasmEdgeRuntimeData;
use common::typegraph::runtimes::KnownRuntime;
use common::typegraph::{runtimes::TGRuntime, Effect, EffectType, Materializer};
use enum_dispatch::enum_dispatch;
use indexmap::IndexMap;
use sha2::{Digest, Sha256};

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
                let module_mat = c.register_materializer(s, import.module).unwrap().0;
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

fn http_method(method: HttpMethod) -> &'static str {
    match method {
        HttpMethod::Get => "GET",
        HttpMethod::Post => "POST",
        HttpMethod::Put => "PUT",
        HttpMethod::Delete => "DELETE",
        HttpMethod::Patch => "PATCH",
    }
}

impl MaterializerConverter for MaterializerHttpRequest {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        s: &Store,
        runtime_id: RuntimeId,
        effect: WitEffect,
    ) -> Result<common::typegraph::Materializer> {
        let runtime = c.register_runtime(s, runtime_id)?;

        let mut data: IndexMap<String, serde_json::Value> = serde_json::from_value(json!({
            "verb": http_method(self.method),
            "path": self.path,
            "content_type": self.content_type.as_deref().unwrap_or("application/json"),
            "header_prefix": self.header_prefix.as_deref().unwrap_or("header#"),
        }))
        .unwrap();

        if let Some(query_fields) = &self.query_fields {
            data.insert(
                "query_fields".to_string(),
                serde_json::to_value(query_fields).unwrap(),
            );
        }
        if let Some(rename_fields) = &self.rename_fields {
            data.insert(
                "rename_fields".to_string(),
                serde_json::to_value(rename_fields).unwrap(),
            );
        }
        if let Some(body_fields) = &self.body_fields {
            data.insert(
                "body_fields".to_string(),
                serde_json::to_value(body_fields).unwrap(),
            );
        }
        if let Some(auth_token_field) = &self.auth_token_field {
            data.insert(
                "auth_token_field".to_string(),
                serde_json::to_value(auth_token_field).unwrap(),
            );
        }

        Ok(Materializer {
            // TODO rename to http for consistency
            name: "rest".to_string(),
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
            Lambda(lambda) => {
                let mut data = IndexMap::new();
                let mut sha256 = Sha256::new();
                sha256.update(lambda.fn_.clone());
                let fn_hash: String = format!("sha256_{:x}", sha256.finalize());
                data.insert("name".to_string(), serde_json::Value::String(fn_hash));
                data.insert(
                    "fn".to_string(),
                    serde_json::Value::String(lambda.fn_.clone()),
                );
                ("lambda".to_string(), data)
            }
            Def(def) => {
                let mut data = IndexMap::new();
                data.insert(
                    "name".to_string(),
                    serde_json::Value::String(def.name.clone()),
                );
                data.insert("fn".to_string(), serde_json::Value::String(def.fn_.clone()));
                ("def".to_string(), data)
            }
            Module(module) => {
                let mut data = IndexMap::new();
                data.insert(
                    "code".to_string(),
                    serde_json::Value::String(format!("file:{}", module.file)),
                );
                ("pymodule".to_string(), data)
            }
            Import(import) => {
                let module_mat = c.register_materializer(s, import.module).unwrap().0;
                let data = serde_json::from_value(json!({
                    "mod": module_mat,
                    "name": import.func_name,
                    "secrets": import.secrets,
                }))
                .unwrap();
                ("import_function".to_string(), data)
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

impl MaterializerConverter for RandomMaterializer {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        s: &Store,
        runtime_id: RuntimeId,
        effect: WitEffect,
    ) -> Result<Materializer> {
        let runtime = c.register_runtime(s, runtime_id)?;
        let RandomMaterializer::Runtime(ret) = self;
        let data = serde_json::from_value(json!({
            "runtime": ret.runtime,
        }))
        .map_err(|e| e.to_string())?;

        let name = "random".to_string();
        Ok(Materializer {
            name,
            runtime,
            effect: effect.into(),
            data,
        })
    }
}

impl MaterializerConverter for WasiMaterializer {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        s: &Store,
        runtime_id: RuntimeId,
        effect: WitEffect,
    ) -> Result<Materializer> {
        let runtime = c.register_runtime(s, runtime_id)?;
        let WasiMaterializer::Module(mat) = self;

        let data = serde_json::from_value(json!({
            "wasm": mat.module,
            "func": mat.func_name
        }))
        .map_err(|e| e.to_string())?;

        let name = "wasi".to_string();
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

pub enum ConvertedRuntime {
    Converted(TGRuntime),
    Lazy(Box<dyn FnOnce(RuntimeId, &Store, &mut TypegraphContext) -> Result<TGRuntime>>),
}

impl From<TGRuntime> for ConvertedRuntime {
    fn from(runtime: TGRuntime) -> Self {
        ConvertedRuntime::Converted(runtime)
    }
}

pub fn convert_runtime(
    c: &mut TypegraphContext,
    s: &Store,
    runtime: &Runtime,
) -> Result<ConvertedRuntime> {
    use KnownRuntime::*;

    match runtime {
        Runtime::Deno => {
            let data = DenoRuntimeData {
                worker: "default".to_string(),
                permissions: Default::default(),
            };
            Ok(TGRuntime::Known(Deno(data)).into())
        }
        Runtime::Graphql(d) => {
            let data = GraphQLRuntimeData {
                endpoint: d.endpoint.clone(),
            };
            Ok(TGRuntime::Known(GraphQL(data)).into())
        }
        Runtime::Http(d) => {
            let data = HTTPRuntimeData {
                endpoint: d.endpoint.clone(),
                cert_secret: d.cert_secret.clone(),
                basic_auth_secret: d.basic_auth_secret.clone(),
            };
            Ok(TGRuntime::Known(HTTP(data)).into())
        }
        Runtime::Python => {
            Ok(TGRuntime::Known(PythonWasi(PythonRuntimeData { config: None })).into())
        }
        Runtime::Random(d) => Ok(TGRuntime::Known(Random(RandomRuntimeData {
            seed: d.seed,
            reset: d.reset.clone(),
        }))
        .into()),
        Runtime::WasmEdge => {
            Ok(TGRuntime::Known(WasmEdge(WasmEdgeRuntimeData { config: None })).into())
        }
        Runtime::Prisma(d, _) => {
            let d = d.clone();
            Ok(ConvertedRuntime::Lazy(Box::new(
                move |runtime_id, store, tg| {
                    with_prisma_runtime(runtime_id, |ctx| {
                        let reg = &ctx.registry;
                        let models: Vec<_> = reg
                            .models
                            .iter()
                            .map(|(type_id, _)| type_id.clone())
                            .collect();
                        let relationships = reg.relationships.clone();
                        let mut conversion_context = ConversionContext {
                            runtime_id,
                            store,
                            tg_context: tg,
                        };
                        Ok(TGRuntime::Known(Prisma(PrismaRuntimeData {
                            name: d.name.clone(),
                            connection_string_secret: d.connection_string_secret.clone(),
                            models: models
                                .into_iter()
                                .map(|id| {
                                    Ok(conversion_context
                                        .tg_context
                                        .register_type(store, id.into(), Some(runtime_id))?
                                        .into())
                                })
                                .collect::<Result<Vec<_>>>()?,
                            relationships: relationships
                                .into_iter()
                                .map(|(_name, rel)| -> Result<_> {
                                    conversion_context.convert_relationship(rel)
                                })
                                .collect::<Result<Vec<_>>>()?,
                            migration_options: None,
                        })))
                    })
                },
            )))
        }
    }
}
