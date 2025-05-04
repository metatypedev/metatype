// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::runtimes::prisma::get_prisma_context;
use crate::runtimes::{
    DenoMaterializer, Materializer as RawMaterializer, PythonMaterializer, RandomMaterializer,
    Runtime, TemporalMaterializer, WasmMaterializer,
};
use crate::sdk::core::{Artifact as SdkArtifact, RuntimeId};
use crate::sdk::runtimes::{
    HttpMethod, KvMaterializer, MaterializerHttpRequest, SubstantialBackend,
};
use crate::{sdk::runtimes::Effect as SdkEffect, typegraph::TypegraphContext};
use enum_dispatch::enum_dispatch;
use indexmap::IndexMap;
use serde_json::json;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::PathBuf;
use std::rc::Rc;
use tg_schema::runtimes::deno::DenoRuntimeData;
use tg_schema::runtimes::graphql::GraphQLRuntimeData;
use tg_schema::runtimes::grpc::GrpcRuntimeData;
use tg_schema::runtimes::http::HTTPRuntimeData;
use tg_schema::runtimes::kv::KvRuntimeData;
use tg_schema::runtimes::python::PythonRuntimeData;
use tg_schema::runtimes::random::RandomRuntimeData;
use tg_schema::runtimes::s3::S3RuntimeData;
use tg_schema::runtimes::substantial::{
    self, RedisConfig, SubstantialRuntimeData, WorkflowFileDescription,
};
use tg_schema::runtimes::temporal::TemporalRuntimeData;
use tg_schema::runtimes::wasm::WasmRuntimeData;
use tg_schema::runtimes::{
    Artifact, KnownRuntime, PrismaMigrationRuntimeData, TypegateRuntimeData, TypegraphRuntimeData,
};
use tg_schema::{runtimes::TGRuntime, Effect, EffectType, Materializer};
use unindent::Unindent;

fn effect(typ: EffectType, idempotent: bool) -> Effect {
    Effect {
        effect: Some(typ),
        idempotent,
    }
}

impl From<SdkEffect> for Effect {
    fn from(eff: SdkEffect) -> Self {
        match eff {
            SdkEffect::Read => effect(EffectType::Read, true),
            SdkEffect::Create(idemp) => effect(EffectType::Create, idemp),
            SdkEffect::Update(idemp) => effect(EffectType::Update, idemp),
            SdkEffect::Delete(idemp) => effect(EffectType::Delete, idemp),
        }
    }
}

#[enum_dispatch(MaterializerData)]
pub trait MaterializerConverter {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        runtime_id: RuntimeId,
        effect: SdkEffect,
    ) -> Result<tg_schema::Materializer>;
}

impl<T: MaterializerConverter> MaterializerConverter for Rc<T> {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        runtime_id: RuntimeId,
        effect: SdkEffect,
    ) -> Result<tg_schema::Materializer> {
        (**self).convert(c, runtime_id, effect)
    }
}

impl MaterializerConverter for DenoMaterializer {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        runtime_id: RuntimeId,
        effect: SdkEffect,
    ) -> Result<Materializer> {
        use crate::runtimes::DenoMaterializer::*;
        let runtime = c.register_runtime(runtime_id)?;
        let (name, data) = match self {
            Static(inner) => {
                let data = serde_json::from_value(json!({
                    "value": inner.value,
                }))
                .unwrap();
                ("static".to_string(), data)
            }
            Inline(inline_fun) => {
                let mut data = IndexMap::new();
                data.insert(
                    "script".to_string(),
                    serde_json::Value::String(format!(
                        "var _my_lambda = {}",
                        &inline_fun.code.unindent()
                    )),
                );
                data.insert(
                    "secrets".to_string(),
                    serde_json::to_value(&inline_fun.secrets).unwrap(),
                );
                ("function".to_string(), data)
            }
            Module(module) => {
                let data = serde_json::from_value(json!({
                    "entryPoint": module.file,
                    "deps": module.deps,
                }))
                .unwrap();
                ("module".to_string(), data)
            }
            Import(import) => {
                let module_mat = c.register_materializer(import.module).unwrap();
                let data = serde_json::from_value(json!({
                    "mod": module_mat,
                    "name": import.func_name,
                    "secrets": import.secrets,
                }))
                .unwrap();
                ("import_function".to_string(), data)
            }
            Predefined(predef) => {
                let data = serde_json::from_value(serde_json::to_value(predef).unwrap()).unwrap();
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
        runtime_id: RuntimeId,
        effect: SdkEffect,
    ) -> Result<tg_schema::Materializer> {
        let runtime = c.register_runtime(runtime_id)?;

        let mut data: IndexMap<String, serde_json::Value> = serde_json::from_value(json!({
            "verb": http_method(self.method.clone()),
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
                serde_json::to_value(rename_fields.iter().cloned().collect::<HashMap<_, _>>())
                    .unwrap(),
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
        runtime_id: RuntimeId,
        effect: SdkEffect,
    ) -> Result<Materializer> {
        use crate::runtimes::PythonMaterializer::*;
        let runtime = c.register_runtime(runtime_id)?;
        let (name, data) = match self {
            Lambda(lambda) => {
                let mut data = IndexMap::new();
                let mut sha256 = Sha256::new();
                sha256.update(lambda.function.clone());
                let fn_hash: String = format!("sha256_{:x}", sha256.finalize());
                data.insert("name".to_string(), serde_json::Value::String(fn_hash));
                data.insert(
                    "fn".to_string(),
                    serde_json::Value::String(lambda.function.clone()),
                );
                ("lambda".to_string(), data)
            }
            Def(def) => {
                let mut data = IndexMap::new();
                data.insert(
                    "name".to_string(),
                    serde_json::Value::String(def.name.clone()),
                );
                data.insert(
                    "fn".to_string(),
                    serde_json::Value::String(def.function.clone()),
                );
                ("def".to_string(), data)
            }
            Module(module) => {
                let data = serde_json::from_value(json!({
                    "entryPoint": module.file,
                    "deps": module.deps,
                }))
                .map_err(|e| e.to_string())?;

                ("pymodule".to_string(), data)
            }
            Import(import) => {
                let module_mat = c.register_materializer(import.module).unwrap();
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
        runtime_id: RuntimeId,
        effect: SdkEffect,
    ) -> Result<Materializer> {
        let runtime = c.register_runtime(runtime_id)?;
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

impl From<SdkArtifact> for Artifact {
    fn from(artifact: SdkArtifact) -> Self {
        Artifact {
            path: artifact.path.into(),
            hash: artifact.hash,
            size: artifact.size,
        }
    }
}

impl From<Artifact> for SdkArtifact {
    fn from(artifact: Artifact) -> Self {
        SdkArtifact {
            path: artifact.path.as_os_str().to_str().unwrap().to_string(),
            hash: artifact.hash,
            size: artifact.size,
        }
    }
}

impl MaterializerConverter for WasmMaterializer {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        runtime_id: RuntimeId,
        effect: SdkEffect,
    ) -> Result<Materializer> {
        let runtime = c.register_runtime(runtime_id)?;
        let (name, func_name) = match &self {
            WasmMaterializer::ReflectedFunc(func) => ("wasm_reflected_func", &func.func_name[..]),
            WasmMaterializer::WireHandler(handler) => ("wasm_wire_handler", &handler.func_name[..]),
        };

        let data = serde_json::from_value(json!({
            "op_name": func_name,
        }))
        .map_err(|e| e.to_string())?;

        let name = name.to_string();
        Ok(Materializer {
            name,
            runtime,
            effect: effect.into(),
            data,
        })
    }
}

impl MaterializerConverter for TemporalMaterializer {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        runtime_id: RuntimeId,
        effect: SdkEffect,
    ) -> Result<Materializer> {
        use crate::runtimes::TemporalMaterializer::*;
        let runtime = c.register_runtime(runtime_id)?;
        let (data, name) = match self {
            Start { workflow_type } => {
                let data = serde_json::from_value(json!({
                    "workflow_type": workflow_type,
                }))
                .unwrap();
                (data, "start_workflow".to_string())
            }
            Signal { signal_name } => {
                let data = serde_json::from_value(json!({
                    "signal_name": signal_name,
                }))
                .unwrap();
                (data, "signal_workflow".to_string())
            }
            Query { query_type } => {
                let data = serde_json::from_value(json!({
                    "query_type": query_type,
                }))
                .unwrap();
                (data, "query_workflow".to_string())
            }
            Describe => {
                let data = serde_json::from_value(json!({})).unwrap();
                (data, "describe_workflow".to_string())
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

impl MaterializerConverter for KvMaterializer {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        runtime_id: RuntimeId,
        effect: SdkEffect,
    ) -> Result<Materializer> {
        let runtime = c.register_runtime(runtime_id)?;
        let data = serde_json::from_value(json!({})).map_err(|e| e.to_string())?;
        let name = match self {
            KvMaterializer::Get => "kv_get".to_string(),
            KvMaterializer::Set => "kv_set".to_string(),
            KvMaterializer::Delete => "kv_delete".to_string(),
            KvMaterializer::Keys => "kv_keys".to_string(),
            KvMaterializer::Values => "kv_values".to_string(),
            KvMaterializer::Lpush => "kv_lpush".to_string(),
            KvMaterializer::Rpush => "kv_rpush".to_string(),
            KvMaterializer::Lpop => "kv_lpop".to_string(),
            KvMaterializer::Rpop => "kv_rpop".to_string(),
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
    mat: RawMaterializer,
) -> Result<Materializer> {
    mat.data.convert(c, mat.runtime_id, mat.effect)
}

type RuntimeInitializer = Box<dyn FnOnce(RuntimeId, &mut TypegraphContext) -> Result<TGRuntime>>;

pub enum ConvertedRuntime {
    Converted(TGRuntime),
    Lazy(RuntimeInitializer),
}

impl From<TGRuntime> for ConvertedRuntime {
    fn from(runtime: TGRuntime) -> Self {
        ConvertedRuntime::Converted(runtime)
    }
}

pub fn convert_runtime(_c: &mut TypegraphContext, runtime: Runtime) -> Result<ConvertedRuntime> {
    use KnownRuntime as Rt;

    match runtime {
        Runtime::Deno => {
            let data = DenoRuntimeData {
                worker: "default".to_string(),
                permissions: Default::default(),
            };
            Ok(TGRuntime::Known(Rt::Deno(data)).into())
        }
        Runtime::Graphql(d) => {
            let data = GraphQLRuntimeData {
                endpoint: d.endpoint.clone(),
            };
            Ok(TGRuntime::Known(Rt::GraphQL(data)).into())
        }
        Runtime::Http(d) => {
            let data = HTTPRuntimeData {
                endpoint: d.endpoint.clone(),
                cert_secret: d.cert_secret.clone(),
                basic_auth_secret: d.basic_auth_secret.clone(),
            };
            Ok(TGRuntime::Known(Rt::HTTP(data)).into())
        }
        Runtime::Python => {
            Ok(TGRuntime::Known(Rt::Python(PythonRuntimeData { config: None })).into())
        }
        Runtime::Random(d) => Ok(TGRuntime::Known(Rt::Random(RandomRuntimeData {
            seed: d.seed,
            reset: d.reset.clone(),
        }))
        .into()),
        Runtime::WasmReflected(data) => Ok(TGRuntime::Known(Rt::WasmReflected(WasmRuntimeData {
            wasm_artifact: std::path::PathBuf::from(&data.wasm_artifact),
        }))
        .into()),
        Runtime::WasmWire(data) => Ok(TGRuntime::Known(Rt::WasmWire(WasmRuntimeData {
            wasm_artifact: std::path::PathBuf::from(&data.wasm_artifact),
        }))
        .into()),
        Runtime::Prisma(d, _) => Ok(ConvertedRuntime::Lazy(Box::new(
            move |runtime_id, tg| -> Result<_> {
                let ctx = get_prisma_context(runtime_id);
                let ctx = ctx.borrow();

                Ok(TGRuntime::Known(Rt::Prisma(ctx.convert(tg, d)?)))
            },
        ))),
        Runtime::PrismaMigration => {
            Ok(TGRuntime::Known(Rt::PrismaMigration(PrismaMigrationRuntimeData {})).into())
        }
        Runtime::Temporal(d) => Ok(TGRuntime::Known(Rt::Temporal(TemporalRuntimeData {
            name: d.name.clone(),
            host_secret: d.host_secret.clone(),
            namespace_secret: d.namespace_secret.clone(),
        }))
        .into()),
        Runtime::Typegate => Ok(TGRuntime::Known(Rt::Typegate(TypegateRuntimeData {})).into()),
        Runtime::Typegraph => Ok(TGRuntime::Known(Rt::Typegraph(TypegraphRuntimeData {})).into()),
        Runtime::S3(d) => Ok(TGRuntime::Known(Rt::S3(S3RuntimeData {
            host_secret: d.host_secret.clone(),
            region_secret: d.region_secret.clone(),
            access_key_secret: d.access_key_secret.clone(),
            secret_key_secret: d.secret_key_secret.clone(),
            path_style_secret: d.path_style_secret.clone(),
        }))
        .into()),
        Runtime::Substantial(data) => {
            let backend = match data.backend.clone() {
                SubstantialBackend::Memory => substantial::SubstantialBackend::Memory,
                SubstantialBackend::Fs => substantial::SubstantialBackend::Fs,
                SubstantialBackend::Redis(redis) => {
                    substantial::SubstantialBackend::Redis(RedisConfig {
                        connection_string: redis.connection_string_secret.clone(),
                    })
                }
            };

            Ok(TGRuntime::Known(Rt::Substantial(SubstantialRuntimeData {
                backend,
                workflows: data
                    .file_descriptions
                    .clone()
                    .into_iter()
                    .map(|desc| WorkflowFileDescription {
                        file: PathBuf::from(desc.file.clone()),
                        kind: match desc.kind {
                            crate::sdk::runtimes::WorkflowKind::Python => {
                                substantial::WorkflowKind::Python
                            }
                            crate::sdk::runtimes::WorkflowKind::Deno => {
                                substantial::WorkflowKind::Deno
                            }
                        },
                        deps: desc.deps.clone().into_iter().map(PathBuf::from).collect(),
                        imports: desc.workflows,
                    })
                    .collect(),
            }))
            .into())
        }
        Runtime::Kv(d) => Ok(TGRuntime::Known(Rt::Kv(KvRuntimeData { url: d.url.clone() })).into()),
        Runtime::Grpc(d) => Ok(TGRuntime::Known(Rt::Grpc(GrpcRuntimeData {
            proto_file_content: d.proto_file.clone(),
            endpoint: d.endpoint.clone(),
        }))
        .into()),
    }
}
