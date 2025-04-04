// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::conversion::hash::Hasher;
use crate::conversion::runtimes::{convert_materializer, convert_runtime, ConvertedRuntime};
use crate::conversion::types::TypeConversion as _;
use crate::global_store::SavedState;
use crate::typedef::struct_::extend_policy_chain;
use crate::types::{
    AsTypeDefEx as _, FindAttribute as _, PolicySpec, TypeDef, TypeDefExt, TypeId, WithPolicy,
};
use crate::utils::postprocess::naming::NamingProcessor;
use crate::utils::postprocess::{PostProcessor, TypegraphPostProcessor};
use crate::validation::validate_name;
use crate::{
    errors::{self, Result},
    global_store::Store,
};
use indexmap::IndexMap;
use std::cell::RefCell;
use std::collections::hash_map::Entry;
use std::collections::{HashMap, HashSet};
use std::hash::Hasher as _;
use std::path::{Path, PathBuf};
use std::rc::Rc;
use tg_schema::runtimes::TGRuntime;
use tg_schema::{
    Materializer, ObjectTypeData, Policy, PolicyIndices, PolicyIndicesByEffect, Queries, TypeMeta,
    TypeNode, TypeNodeBase, Typegraph,
};

use crate::sdk::core::{
    Artifact as SdkArtifact, Error as TgError, MaterializerId, PolicyId, RuntimeId,
    SerializeParams, TypegraphInitParams,
};

#[derive(Default)]
struct IdMapping {
    types_to_hash: HashMap<u32, u64>,
    hash_to_type: HashMap<u64, u32>,
    runtimes: HashMap<u32, u32>,
    materializers: HashMap<u32, u32>,
    policies: HashMap<u32, u32>,
}

#[derive(Default)]
struct RuntimeContexts {
    prisma_typegen_cache: Rc<RefCell<HashMap<String, TypeId>>>,
}

#[derive(Default)]
pub struct TypegraphContext {
    name: String,
    path: Option<Rc<Path>>,
    pub(crate) meta: TypeMeta,
    types: Vec<Option<TypeNode>>,
    runtimes: Vec<TGRuntime>,
    materializers: Vec<Option<Materializer>>,
    policies: Vec<Policy>,
    mapping: IdMapping,
    runtime_contexts: RuntimeContexts,
    saved_store_state: Option<SavedState>,
    user_named_types: HashSet<u32>,
}

thread_local! {
    static TG: RefCell<Option<TypegraphContext>> = const { RefCell::new(None) };
}

static TYPEGRAPH_VERSION: &str = "0.0.4";

pub fn with_tg<T>(f: impl FnOnce(&TypegraphContext) -> T) -> Result<T> {
    TG.with(|tg| {
        let tg = tg.borrow();
        tg.as_ref()
            .map(f)
            .ok_or_else(errors::expected_typegraph_context)
    })
}

pub fn with_tg_mut<T>(f: impl FnOnce(&mut TypegraphContext) -> T) -> Result<T> {
    TG.with(|tg| {
        let mut tg = tg.borrow_mut();
        tg.as_mut()
            .map(f)
            .ok_or_else(errors::expected_typegraph_context)
    })
}

pub fn init(params: TypegraphInitParams) -> Result<()> {
    #[cfg(test)]
    eprintln!("Initializing typegraph...");

    TG.with(|tg| {
        if let Some(tg) = tg.borrow().as_ref() {
            Err(errors::nested_typegraph_context(&tg.name))
        } else {
            Ok(())
        }
    })?;

    let mut ctx = TypegraphContext {
        name: params.name.clone(),
        path: Some(PathBuf::from(&params.path).into()),
        meta: TypeMeta {
            version: TYPEGRAPH_VERSION.to_string(),
            queries: Queries {
                dynamic: params.dynamic.unwrap_or(true),
                endpoints: vec![],
            },
            cors: params.cors.into(),
            auths: vec![],
            prefix: params.prefix,
            rate: params.rate.map(|v| v.into()),
            secrets: vec![],
            outjection_secrets: vec![],
            random_seed: Default::default(),
            artifacts: Default::default(),
            namespaces: Default::default(),
        },
        types: vec![],
        saved_store_state: Some(Store::save()),
        ..Default::default()
    };

    // register the deno runtime
    let _default_runtime_idx = ctx.register_runtime(Store::get_deno_runtime())?;

    ctx.types.push(Some(TypeNode::Object {
        base: TypeNodeBase {
            description: None,
            enumeration: None,
            title: params.name,
        },
        data: ObjectTypeData {
            properties: IndexMap::new(),
            policies: Default::default(),
            id: vec![],
            required: vec![],
            additional_props: false,
        },
    }));

    TG.with(move |tg| {
        tg.borrow_mut().replace(ctx);
    });

    Ok(())
}

pub fn finalize_auths(ctx: &mut TypegraphContext) -> Result<Vec<tg_schema::Auth>> {
    Store::get_auths()
        .iter()
        .map(|auth| match auth.protocol {
            tg_schema::AuthProtocol::OAuth2 => {
                let profiler_key = "profiler";
                match auth.auth_data.get(profiler_key) {
                    Some(value) => match value {
                        serde_json::Value::Null => Ok(auth.to_owned()),
                        _ => {
                            let func_store_idx = value
                                .as_number()
                                .ok_or_else(|| "profiler has invalid type index".to_string())
                                .and_then(|n| {
                                    n.as_u64().ok_or_else(|| {
                                        "unable to convert profiler index".to_string()
                                    })
                                })? as u32;

                            let type_idx = ctx.register_type(TypeId(func_store_idx))?;

                            let mut auth_processed = auth.clone();
                            auth_processed
                                .auth_data
                                .insert_full(profiler_key.to_string(), type_idx.into());

                            Ok(auth_processed)
                        }
                    },
                    None => Ok(auth.to_owned()),
                }
            }
            _ => Ok(auth.to_owned()),
        })
        .collect::<Result<Vec<_>>>()
}

pub fn serialize(params: SerializeParams) -> Result<(String, Vec<SdkArtifact>)> {
    #[cfg(test)]
    eprintln!("Serializing typegraph...");

    let mut ctx = TG.with(|tg| {
        tg.borrow_mut()
            .take()
            .ok_or_else(errors::expected_typegraph_context)
    })?;

    let auths = finalize_auths(&mut ctx)?;

    let mut tg = Typegraph {
        types: ctx
            .types
            .into_iter()
            .enumerate()
            .map(|(id, t)| {
                t.ok_or_else(|| format!("Unexpected: type {id} was not finalized").into())
            })
            .collect::<Result<Vec<_>>>()?,
        runtimes: ctx.runtimes,
        materializers: ctx.materializers.into_iter().map(|m| m.unwrap()).collect(),
        policies: ctx.policies,
        meta: TypeMeta {
            queries: Queries {
                dynamic: ctx.meta.queries.dynamic,
                endpoints: Store::get_graphql_endpoints(),
            },
            // artifacts: {
            //     let arts = ctx.meta.artifacts;
            //     let mut arts = arts.into_iter().collect::<Vec<_>>();
            //     arts.sort_by_cached_key(|pair| pair.0.clone());
            //     arts.into_iter().collect()
            // },
            artifacts: ctx.meta.artifacts,
            random_seed: Store::get_random_seed(),
            auths,
            ..ctx.meta
        },
        path: None,
        deps: Default::default(),
    };

    tg.meta.prefix.clone_from(&params.prefix);

    let pretty = params.pretty;

    // dedup_types(&mut tg);

    TypegraphPostProcessor::new(params).postprocess(&mut tg)?;
    NamingProcessor {
        user_named: ctx.user_named_types,
    }
    .postprocess(&mut tg)?;

    let artifacts = tg
        .meta
        .artifacts
        .values()
        .cloned()
        .map(Into::into)
        .collect::<Vec<_>>();

    Store::restore(ctx.saved_store_state.unwrap());

    let result = if pretty {
        serde_json::to_string_pretty(&tg)
    } else {
        serde_json::to_string(&tg)
    };

    let result = match result.map_err(|e| e.to_string().into()) {
        Ok(res) => res,
        Err(e) => {
            return Err(e);
        }
    };

    Ok((result, artifacts))
}

fn ensure_valid_export(export_key: String, type_id: TypeId) -> Result<()> {
    match &type_id.as_xdef()?.type_def {
        TypeDef::Struct(inner) => {
            // namespace
            for (prop_name, prop_type_id) in inner.iter_props() {
                ensure_valid_export(format!("{export_key}::{prop_name}"), prop_type_id)?;
            }
        }
        TypeDef::Func(_) => {}
        _ => return Err(errors::invalid_export_type(&export_key, &type_id.repr()?)),
    }

    Ok(())
}

pub fn expose(
    fields: Vec<(String, TypeId)>,
    default_policy: Option<Vec<crate::sdk::core::PolicySpec>>,
) -> Result<()> {
    let fields = fields
        .into_iter()
        .map(|(key, type_id)| -> Result<_> {
            let xdef = type_id.as_xdef()?;
            let policy_chain = xdef.attributes.find_policy().unwrap_or(&[]);
            let has_policy = !policy_chain.is_empty();

            // TODO how to set default policy on a namespace? Or will it inherit
            // the policies of the namespace?
            let type_id: TypeId = match (has_policy, default_policy.as_ref()) {
                (false, Some(default_policy)) => type_id
                    .with_policy(default_policy.clone().into_iter().map(Into::into).collect())?
                    .id(),
                _ => type_id,
            };

            Ok((key, type_id))
        })
        .collect::<Result<Vec<_>>>()?;

    with_tg_mut(|ctx| -> Result<_> {
        let mut root = ctx.types.get_mut(0).unwrap().take().unwrap();
        let root_data = match &mut root {
            TypeNode::Object { data, .. } => data,
            _ => return Err("expect root to be an object".into()),
        };
        let res = fields
            .into_iter()
            .map(|(key, type_id)| -> Result<_> {
                if !validate_name(&key) {
                    return Err(errors::invalid_export_name(&key));
                }
                if root_data.properties.contains_key(&key) {
                    return Err(errors::duplicate_export_name(&key));
                }
                ensure_valid_export(key.clone(), type_id)?;
                let mut policy_chain = vec![];
                extend_policy_chain(&mut policy_chain, type_id)?;

                let type_idx = ctx.register_type(type_id)?;
                root_data.properties.insert(key.clone(), type_idx.into());
                if !policy_chain.is_empty() {
                    root_data
                        .policies
                        .insert(key.clone(), ctx.register_policy_chain(&policy_chain)?);
                }
                root_data.required.push(key);
                Ok(())
            })
            .collect::<Result<Vec<()>>>();

        ctx.types[0] = Some(root);
        res.map(|_| ())
    })?
}

pub fn set_seed(seed: Option<u32>) -> Result<()> {
    Store::set_random_seed(seed);
    Ok(())
}

impl TypegraphContext {
    pub fn hash_type(&mut self, type_id: TypeId) -> Result<u64> {
        // let type_id = type_def.id().into();
        if let Some(hash) = self.mapping.types_to_hash.get(&type_id.into()) {
            Ok(*hash)
        } else {
            let mut hasher = Hasher::new();
            let xdef = type_id.as_xdef()?;
            xdef.hash_type(&mut hasher, self)?;
            let hash = hasher.finish();
            // crate::logger::warning!("done hashing {:?}: {hash}", xdef.name);
            self.mapping.types_to_hash.insert(type_id.into(), hash);
            Ok(hash)
        }
    }

    pub fn register_type(&mut self, type_id: TypeId) -> Result<TypeId, TgError> {
        // we remove the name before hashing if it's not
        // user named
        let xdef = type_id.as_xdef()?;
        let is_user_named = if let Some(name) = xdef.name.as_deref() {
            Store::is_user_named(name).unwrap_or(false)
        } else {
            false
        };
        let xdef = type_id.as_xdef()?;
        let hash = self.hash_type(type_id)?;

        match self.mapping.hash_to_type.entry(hash) {
            Entry::Vacant(e) => {
                // to prevent infinite loop from circular dependencies,
                // we allocate first a slot in the array for the type with None
                // and register it into the mappings so that any dependency
                // would resolve it as already registered with the right idx.

                let idx = self.types.len();
                e.insert(idx as u32);
                self.types.push(None);

                // let tpe = id.as_type()?;

                let type_node = xdef.type_def.clone().convert(self, xdef)?;

                self.types[idx] = Some(type_node);
                if is_user_named {
                    self.user_named_types.insert(idx as u32);
                }

                Ok((idx as u32).into())
            }

            Entry::Occupied(e) => Ok((*e.get()).into()),
        }
    }

    pub fn register_materializer(&mut self, id: u32) -> Result<MaterializerId, TgError> {
        match self.mapping.materializers.entry(id) {
            Entry::Vacant(e) => {
                let idx = self.materializers.len();
                e.insert(idx as u32);
                self.materializers.push(None);
                let mat_internal = Store::get_materializer(id)?;
                let converted = convert_materializer(self, mat_internal)?;
                self.materializers[idx] = Some(converted);
                Ok(idx as MaterializerId)
            }
            Entry::Occupied(e) => {
                let mat_idx = *e.get();
                Ok(mat_idx)
            }
        }
    }

    pub fn register_policy_chain(&mut self, chain: &[PolicySpec]) -> Result<Vec<PolicyIndices>> {
        chain
            .iter()
            .map(|p| -> Result<_> {
                Ok(match p {
                    PolicySpec::Simple(id) => PolicyIndices::Policy(self.register_policy(id.0)?),
                    PolicySpec::PerEffect(policies) => {
                        PolicyIndices::EffectPolicies(PolicyIndicesByEffect {
                            read: policies
                                .read
                                .as_ref()
                                .map(|id| self.register_policy(id.0))
                                .transpose()?,
                            create: policies
                                .create
                                .as_ref()
                                .map(|id| self.register_policy(id.0))
                                .transpose()?,
                            delete: policies
                                .delete
                                .as_ref()
                                .map(|id| self.register_policy(id.0))
                                .transpose()?,
                            update: policies
                                .update
                                .as_ref()
                                .map(|id| self.register_policy(id.0))
                                .transpose()?,
                        })
                    }
                })
            })
            .collect()
    }

    pub fn register_policy(&mut self, id: u32) -> Result<PolicyId> {
        if let Some(idx) = self.mapping.policies.get(&id) {
            Ok(*idx)
        } else {
            let converted = Store::get_policy(id)?.convert(self)?;
            let idx = self.policies.len();
            self.policies.push(converted);
            self.mapping.policies.insert(id, idx as u32);
            Ok(idx as PolicyId)
        }
    }

    pub fn register_runtime(&mut self, id: u32) -> Result<RuntimeId, TgError> {
        if let Some(idx) = self.mapping.runtimes.get(&id) {
            Ok(*idx)
        } else {
            let converted = convert_runtime(self, Store::get_runtime(id)?)?;
            let idx = self.runtimes.len();
            self.mapping.runtimes.insert(id, idx as u32);
            match converted {
                ConvertedRuntime::Converted(rt) => self.runtimes.push(rt),
                ConvertedRuntime::Lazy(lazy) => {
                    // we allocate first a slot in the array, as the lazy conversion might register
                    // other runtimes
                    self.runtimes.push(TGRuntime::Unknown(Default::default()));
                    let rt = lazy(id, self)?;
                    self.runtimes[idx] = rt;
                }
            };
            Ok(idx as RuntimeId)
        }
    }

    pub fn find_type_index_by_store_id(&self, id: TypeId) -> Option<u32> {
        let hash = self.mapping.types_to_hash.get(&id.into())?;
        self.mapping.hash_to_type.get(hash).copied()
    }

    pub fn get_correct_id(&self, id: TypeId) -> Result<u32> {
        let id = id.as_xdef()?.type_def.id();
        self.find_type_index_by_store_id(id)
            .ok_or(format!("unable to find type for store id {}", u32::from(id)).into())
    }

    pub fn add_secret(&mut self, name: impl Into<String>) {
        // TODO unicity
        self.meta.secrets.push(name.into());
    }

    pub fn get_prisma_typegen_cache(&self) -> Rc<RefCell<HashMap<String, TypeId>>> {
        Rc::clone(&self.runtime_contexts.prisma_typegen_cache)
    }

    pub fn find_materializer_index_by_store_id(&self, id: u32) -> Option<u32> {
        self.mapping.materializers.get(&id).copied()
    }

    pub fn find_policy_index_by_store_id(&self, id: u32) -> Option<u32> {
        self.mapping.policies.get(&id).copied()
    }
}

pub fn current_typegraph_path() -> Result<Rc<Path>> {
    with_tg(|tg| tg.path.clone().unwrap())
}

pub fn current_typegraph_dir() -> Result<PathBuf> {
    let tg_path = current_typegraph_path()?;
    // TODO error handling
    Ok(tg_path.parent().unwrap().to_owned())
}

pub fn reset() {
    TG.with_borrow_mut(|tg| {
        tg.take();
        Store::reset();
    });
}
