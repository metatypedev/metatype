use crate::errors::Result;
use crate::global_store::Store;
use crate::runtimes::{Materializer as RawMaterializer, MaterializerData, Runtime};
use crate::{typegraph::TypegraphContext, wit::runtimes::Effect as WitEffect};
use common::typegraph::{Effect, EffectType, Materializer, TGRuntime};
use indexmap::IndexMap;
use serde_json::json;

fn effect(typ: EffectType, idempotent: bool) -> Effect {
    Effect {
        effect: Some(typ),
        idempotent,
    }
}

fn convert_effect(eff: WitEffect) -> Effect {
    match eff {
        WitEffect::None => effect(EffectType::None, true),
        WitEffect::Create(idemp) => effect(EffectType::Create, idemp),
        WitEffect::Update(idemp) => effect(EffectType::Update, idemp),
        WitEffect::Delete(idemp) => effect(EffectType::Delete, idemp),
        WitEffect::Upsert(idemp) => effect(EffectType::Upsert, idemp),
    }
}

pub fn convert_materializer(
    c: &mut TypegraphContext,
    s: &Store,
    mat: &RawMaterializer,
) -> Result<Materializer> {
    match &mat.data {
        MaterializerData::Deno(deno) => {
            use crate::runtimes::DenoMaterializer::*;
            let runtime = c.register_runtime(s, mat.runtime_id)?;
            let effect = convert_effect(mat.effect);
            let (name, data) = match deno {
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
                        "file": module.file
                    }))
                    .unwrap();
                    ("module".to_string(), data)
                }
                Import(import) => {
                    let module_mat = c.register_materializer(s, import.module);
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
                effect,
                data,
            })
        }
    }
}

pub fn convert_runtime(
    _c: &mut TypegraphContext,
    _s: &Store,
    runtime: &Runtime,
) -> Result<TGRuntime> {
    match runtime {
        Runtime::Deno => {
            let mut data = IndexMap::new();
            data.insert(
                "worker".to_string(),
                serde_json::Value::String("default".to_string()),
            );
            Ok(TGRuntime {
                name: "deno".to_string(),
                data,
            })
        }
    }
}
