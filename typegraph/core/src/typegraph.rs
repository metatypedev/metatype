// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::conversion::runtimes::{convert_materializer, convert_runtime};
use crate::conversion::types::{gen_base, TypeConversion};
use crate::global_store::with_store;
use crate::host::abi;
use crate::types::{Type, TypeFun, WrapperTypeData};
use crate::validation::validate_name;
use crate::{
    errors::{self, Result},
    global_store::Store,
};
use common::typegraph::runtimes::TGRuntime;
use common::typegraph::{
    Materializer, ObjectTypeData, Policy, PolicyIndices, PolicyIndicesByEffect, Queries, TypeMeta,
    TypeNode, Typegraph,
};
use graphql_parser::parse_query;
use indexmap::IndexMap;
use std::cell::RefCell;
use std::collections::hash_map::Entry;
use std::collections::HashMap;

use std::path::Path;

use crate::wit::core::{
    Error as TgError, MaterializerId, PolicyId, PolicySpec, RuntimeId, TypeId, TypegraphInitParams,
};

#[derive(Default)]
struct IdMapping {
    types: HashMap<u32, u32>,
    runtimes: HashMap<u32, u32>,
    materializers: HashMap<u32, u32>,
    policies: HashMap<u32, u32>,
}

#[derive(Default)]
pub struct TypegraphContext {
    name: String,
    meta: TypeMeta,
    types: Vec<Option<TypeNode>>,
    runtimes: Vec<TGRuntime>,
    materializers: Vec<Option<Materializer>>,
    policies: Vec<Policy>,
    mapping: IdMapping,
}

thread_local! {
    static TG: RefCell<Option<TypegraphContext>> = RefCell::new(None);
}

static TYPEGRAPH_VERSION: &str = "0.0.2";

// pub fn with_tg<T>(f: impl FnOnce(&TypegraphContext) -> T) -> Result<T> {
//     TG.with(|tg| {
//         let tg = tg.borrow();
//         tg.as_ref()
//             .map(|tg| f(tg))
//             .ok_or_else(errors::expected_typegraph_context)
//     })
// }

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

    let endpoints = {
        let glob = format!(
            "{}/**/*",
            Path::new(&params.path)
                .join(params.folder.unwrap_or(params.name.clone()))
                .to_str()
                .expect("Invalid path")
        );

        abi::glob(&glob, &["graphql".to_string(), "gql".to_string()])?
            .into_iter()
            .flat_map(|p| {
                let data = abi::read_file(&p).unwrap();
                let ast = parse_query::<&str>(&data).unwrap();
                ast.definitions
                    .into_iter()
                    .map(|op| {
                        format!("{}", op)
                            .split_whitespace()
                            .collect::<Vec<_>>()
                            .join(" ")
                    })
                    .collect::<Vec<_>>()
            })
            .collect::<Vec<_>>()
    };

    let mut ctx = TypegraphContext {
        name: params.name.clone(),
        meta: TypeMeta {
            version: TYPEGRAPH_VERSION.to_string(),
            queries: Queries {
                dynamic: params.dynamic.unwrap_or(true),
                endpoints,
            },
            ..Default::default()
        },
        types: vec![],
        ..Default::default()
    };

    // register the deno runtime
    let default_runtime_idx = with_store(|s| ctx.register_runtime(s, s.get_deno_runtime()))?;

    ctx.types.push(Some(TypeNode::Object {
        base: gen_base(params.name, None, default_runtime_idx, None),
        data: ObjectTypeData {
            properties: IndexMap::new(),
            required: vec![],
        },
    }));

    TG.with(move |tg| {
        tg.borrow_mut().replace(ctx);
    });

    Ok(())
}

pub fn finalize() -> Result<String> {
    #[cfg(test)]
    eprintln!("Finalizing typegraph...");

    let ctx = TG.with(|tg| {
        tg.borrow_mut()
            .take()
            .ok_or_else(errors::expected_typegraph_context)
    })?;

    let tg = Typegraph {
        id: format!("https://metatype.dev/specs/{TYPEGRAPH_VERSION}.json"),
        types: ctx
            .types
            .into_iter()
            .enumerate()
            .map(|(id, t)| t.ok_or_else(|| format!("Unexpected: type {id} was not finalized")))
            .collect::<Result<Vec<_>>>()?,
        runtimes: ctx.runtimes,
        materializers: ctx.materializers.into_iter().map(|m| m.unwrap()).collect(),
        policies: ctx.policies,
        meta: ctx.meta,
        path: None,
        deps: Default::default(),
    };

    serde_json::to_string(&tg).map_err(|e| e.to_string())
}

pub fn expose(fns: Vec<(String, TypeId)>, namespace: Vec<String>) -> Result<()> {
    with_tg_mut(|ctx| -> Result<()> {
        if !namespace.is_empty() {
            return Err(String::from("namespaces not supported"));
        }

        let mut root_type = ctx.types.get_mut(0).unwrap().take().unwrap();
        let res = with_store(|s| ctx.expose_on(&mut root_type, s, fns));
        ctx.types[0] = Some(root_type);
        res
    })?
}

impl TypegraphContext {
    fn expose_on(
        &mut self,
        target: &mut TypeNode,
        s: &Store,
        fns: Vec<(String, TypeId)>,
    ) -> Result<()> {
        let root = match target {
            TypeNode::Object { ref mut data, .. } => data,
            _ => panic!("expected a struct as root type"),
        };
        for (name, type_id) in fns.into_iter() {
            if !validate_name(&name) {
                return Err(errors::invalid_export_name(&name));
            }
            let type_id = s.resolve_proxy(type_id)?;
            let tpe = s.get_type(type_id)?;
            let tpe = match tpe {
                Type::WithPolicy(t) => t.data.get_wrapped_type(s).unwrap(),
                Type::WithInjection(t) => t.data.get_wrapped_type(s).unwrap(),
                _ => tpe,
            };
            if !matches!(tpe, Type::Func(_)) {
                return Err(errors::invalid_export_type(&name, &tpe.to_string()));
            }
            if root.properties.contains_key(&name) {
                return Err(errors::duplicate_export_name(&name));
            }

            root.required.push(name.clone());
            root.properties
                .insert(name, self.register_type(s, type_id, None)?);
        }

        Ok(())
    }

    pub fn register_type(
        &mut self,
        store: &Store,
        id: u32,
        runtime_id: Option<u32>,
    ) -> Result<TypeId, TgError> {
        match self.mapping.types.entry(id) {
            Entry::Vacant(e) => {
                // to prevent infinite loop from circular dependencies,
                // we allocate first a slot in the array for the type with None
                // and register it into the mappings so that any dependency
                // would resolve it as already registered with the right idx.

                let idx = self.types.len();
                e.insert(idx as u32);
                self.types.push(None);

                let tpe = store.get_type(id)?;

                let type_node = tpe.convert(self, runtime_id)?;

                self.types[idx] = Some(type_node);
                Ok(idx as TypeId)
            }
            Entry::Occupied(e) => Ok(*e.get()),
        }
    }

    // TODO
    pub fn register_materializer(
        &mut self,
        store: &Store,
        id: u32,
    ) -> Result<(MaterializerId, RuntimeId), TgError> {
        match self.mapping.materializers.entry(id) {
            Entry::Vacant(e) => {
                let idx = self.materializers.len();
                e.insert(idx as u32);
                self.materializers.push(None);
                let converted = convert_materializer(self, store, store.get_materializer(id)?)?;
                let runtime_id = converted.runtime;
                self.materializers[idx] = Some(converted);
                Ok((idx as MaterializerId, runtime_id as RuntimeId))
            }
            Entry::Occupied(e) => {
                let mat_idx = *e.get();
                let mat = self.materializers[mat_idx as usize].as_ref().unwrap();
                Ok((mat_idx, mat.runtime))
            }
        }
    }

    pub fn register_policy_chain(&mut self, chain: &[PolicySpec]) -> Result<Vec<PolicyIndices>> {
        chain
            .iter()
            .map(|p| -> Result<_> {
                Ok(match p {
                    PolicySpec::Simple(id) => PolicyIndices::Policy(self.register_policy(*id)?),
                    PolicySpec::PerEffect(policies) => {
                        PolicyIndices::EffectPolicies(PolicyIndicesByEffect {
                            none: policies
                                .none
                                .as_ref()
                                .map(|id| self.register_policy(*id))
                                .transpose()?,
                            create: policies
                                .create
                                .as_ref()
                                .map(|id| self.register_policy(*id))
                                .transpose()?,
                            delete: policies
                                .delete
                                .as_ref()
                                .map(|id| self.register_policy(*id))
                                .transpose()?,
                            update: policies
                                .update
                                .as_ref()
                                .map(|id| self.register_policy(*id))
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
            let converted = with_store(|s| s.get_policy(id)?.convert(self))?;
            let idx = self.policies.len();
            self.policies.push(converted);
            Ok(idx as PolicyId)
        }
    }

    pub fn register_runtime(&mut self, store: &Store, id: u32) -> Result<RuntimeId, TgError> {
        if let Some(idx) = self.mapping.runtimes.get(&id) {
            Ok(*idx)
        } else {
            let converted = convert_runtime(self, store, store.get_runtime(id)?)?;
            let idx = self.runtimes.len();
            self.mapping.runtimes.insert(id, idx as u32);
            self.runtimes.push(converted);
            Ok(idx as RuntimeId)
        }
    }

    pub fn find_type_index_by_store_id(&self, id: &u32) -> Option<u32> {
        self.mapping.types.get(id).copied()
    }
}
