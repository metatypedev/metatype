// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::conversion::runtimes::{convert_materializer, convert_runtime};
use crate::conversion::types::{
    convert_boolean, convert_func, convert_integer, convert_struct, gen_base,
};
use crate::global_store::store;
use crate::types::{TypeFun, T};
use crate::validation::validate_name;
use crate::{
    errors::{self, Result},
    global_store::Store,
};
use common::typegraph::{
    Cors, Materializer, ObjectTypeData, TGRuntime, TypeMeta, TypeNode, Typegraph,
};
use indexmap::IndexMap;
use once_cell::sync::Lazy;
use std::collections::hash_map::Entry;
use std::collections::HashMap;
use std::sync::{Mutex, MutexGuard};

use crate::wit::core::{Error as TgError, MaterializerId, RuntimeId, TypeId, TypegraphInitParams};

#[derive(Default)]
struct IdMapping {
    types: HashMap<u32, u32>,
    runtimes: HashMap<u32, u32>,
    materializers: HashMap<u32, u32>,
}

pub struct TypegraphContext {
    name: String,
    meta: TypeMeta,
    types: Vec<Option<TypeNode>>,
    runtimes: Vec<TGRuntime>,
    materializers: Vec<Option<Materializer>>,
    mapping: IdMapping,
}

static TG: Lazy<Mutex<Option<TypegraphContext>>> = Lazy::new(|| Mutex::new(None));

static VERSION: &str = "0.0.1";

pub fn tg_context() -> MutexGuard<'static, Option<TypegraphContext>> {
    TG.lock().unwrap()
}

pub fn init(params: TypegraphInitParams) -> Result<()> {
    if let Some(tg) = &*tg_context() {
        return Err(errors::nested_typegraph_context(&tg.name));
    }

    *tg_context() = Some(TypegraphContext {
        name: params.name.clone(),
        meta: TypeMeta {
            auths: Default::default(),
            cors: Cors {
                allow_credentials: false,
                allow_headers: Vec::new(),
                expose_headers: Vec::new(),
                allow_methods: Vec::new(),
                allow_origin: Vec::new(),
                max_age_sec: None,
            },
            rate: Default::default(),
            secrets: Vec::new(),
            version: VERSION.to_string(),
        },
        types: vec![Some(TypeNode::Object {
            base: gen_base(params.name),
            data: ObjectTypeData {
                properties: IndexMap::new(),
                required: vec![],
            },
        })],
        runtimes: Vec::new(),
        materializers: Vec::new(),
        mapping: Default::default(),
    });

    Ok(())
}

pub fn finalize() -> Result<String> {
    let mut ctx = tg_context();
    let ctx = ctx.take().ok_or_else(errors::expected_typegraph_context)?;

    let tg = Typegraph {
        id: format!("https://metatype.dev/specs/{VERSION}.json"),
        types: ctx
            .types
            .into_iter()
            .enumerate()
            .map(|(id, t)| t.ok_or_else(|| format!("Unexpected: type {id} was not finalized")))
            .collect::<Result<Vec<_>>>()?,
        runtimes: ctx.runtimes,
        materializers: ctx.materializers.into_iter().map(|m| m.unwrap()).collect(),
        policies: Vec::new(),
        meta: ctx.meta,
        path: None,
        deps: Default::default(),
    };

    serde_json::to_string(&tg).map_err(|e| e.to_string())
}

pub fn expose(fns: Vec<(String, TypeId)>, namespace: Vec<String>) -> Result<(), String> {
    let mut ctx = tg_context();
    let ctx = ctx
        .as_mut()
        .ok_or_else(errors::expected_typegraph_context)?;
    let s = store();

    if !namespace.is_empty() {
        return Err(String::from("namespaces not supported"));
    }

    let mut root_type = ctx.types.get_mut(0).unwrap().take().unwrap();
    let res = ctx.expose_on(&mut root_type, &s, fns);
    ctx.types[0] = Some(root_type);
    res?;

    Ok(())
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
            if !matches!(tpe, T::Func(_)) {
                return Err(errors::invalid_export_type(&name, &tpe.get_repr(type_id)));
            }
            if root.properties.contains_key(&name) {
                return Err(errors::duplicate_export_name(&name));
            }

            root.required.push(name.clone());
            root.properties
                .insert(name, self.register_type(s, type_id)?);
        }

        Ok(())
    }

    pub fn register_type(&mut self, store: &Store, id: u32) -> Result<TypeId, TgError> {
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
                let type_node = match tpe {
                    T::Struct(typ) => convert_struct(self, store, id, typ),
                    T::Integer(typ) => convert_integer(self, store, id, typ),
                    T::Boolean(typ) => convert_boolean(self, store, id, typ),
                    T::Func(typ) => convert_func(self, store, id, typ),
                    T::Proxy(_p) => return Err("proxy must be resolved".to_string()),
                }?;

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
    ) -> Result<MaterializerId, TgError> {
        match self.mapping.materializers.entry(id) {
            Entry::Vacant(e) => {
                let idx = self.materializers.len();
                e.insert(idx as u32);
                self.materializers.push(None);
                let converted = convert_materializer(self, store, store.get_materializer(id)?)?;
                self.materializers[idx] = Some(converted);
                Ok(idx as MaterializerId)
            }
            Entry::Occupied(e) => Ok(*e.get()),
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
}
