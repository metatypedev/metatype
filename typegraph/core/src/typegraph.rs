// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::conversion::{convert_func, convert_integer, convert_struct, gen_base};
use crate::global_store::store;
use crate::types::{TypeFun, T};
use crate::validation::validate_name;
use crate::{
    errors::{self, Result},
    global_store::Store,
};
use common::typegraph::{Cors, ObjectTypeData, TypeMeta, TypeNode, Typegraph};
use indexmap::IndexMap;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::{Mutex, MutexGuard};

use crate::core::{Error as TgError, TypeId, TypegraphInitParams};

#[derive(Default)]
struct IdMapping {
    types: HashMap<u32, u32>,
}

pub struct TypegraphContext {
    name: String,
    meta: TypeMeta,
    types: Vec<Option<TypeNode>>,
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
        runtimes: Vec::new(),
        materializers: Vec::new(),
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
        use std::collections::hash_map::Entry;
        match self.mapping.types.entry(id) {
            Entry::Vacant(e) => {
                let idx = self.types.len();
                e.insert(idx as u32);
                self.types.push(None);

                let tpe = store.get_type(id)?;
                let type_node = match tpe {
                    T::Struct(typ) => convert_struct(self, store, id, typ),
                    T::Integer(typ) => convert_integer(self, store, id, typ),
                    T::Func(typ) => convert_func(self, store, id, typ),
                    T::Proxy(_p) => return Err("proxy must be resolved".to_string()),
                }?;

                self.types[idx] = Some(type_node);
                Ok(idx as TypeId)
            }
            Entry::Occupied(e) => Ok(*e.get()),
        }
    }
}
