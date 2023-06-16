// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::conversion::runtimes::{convert_materializer, convert_runtime};
use crate::conversion::types::{
    convert_boolean, convert_func, convert_integer, convert_struct, gen_base,
};
use crate::global_store::with_store;
use crate::types::{TypeFun, T};
use crate::validation::validate_name;
use crate::{
    errors::{self, Result},
    global_store::Store,
};
use common::typegraph::{Materializer, ObjectTypeData, TGRuntime, TypeMeta, TypeNode, Typegraph};
use indexmap::IndexMap;
use std::cell::RefCell;
use std::collections::hash_map::Entry;
use std::collections::HashMap;

use crate::wit::core::{Error as TgError, MaterializerId, RuntimeId, TypeId, TypegraphInitParams};

#[derive(Default)]
struct IdMapping {
    types: HashMap<u32, u32>,
    runtimes: HashMap<u32, u32>,
    materializers: HashMap<u32, u32>,
}

#[derive(Default)]
pub struct TypegraphContext {
    name: String,
    meta: TypeMeta,
    types: Vec<Option<TypeNode>>,
    runtimes: Vec<TGRuntime>,
    materializers: Vec<Option<Materializer>>,
    mapping: IdMapping,
}

thread_local! {
    static TG: RefCell<Option<TypegraphContext>> = RefCell::new(None);
}

static VERSION: &str = "0.0.1";

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

    let mut ctx = TypegraphContext {
        name: params.name.clone(),
        meta: TypeMeta {
            version: VERSION.to_string(),
            ..Default::default()
        },
        types: vec![Some(TypeNode::Object {
            base: gen_base(params.name),
            data: ObjectTypeData {
                properties: IndexMap::new(),
                required: vec![],
            },
        })],
        ..Default::default()
    };
    with_store(|s| ctx.register_runtime(s, s.get_deno_runtime()))?;

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
    with_tg_mut(|ctx| {
        if !namespace.is_empty() {
            return Err(String::from("namespaces not supported"));
        }

        let mut root_type = ctx.types.get_mut(0).unwrap().take().unwrap();
        let res = with_store(|s| ctx.expose_on(&mut root_type, s, fns));
        ctx.types[0] = Some(root_type);
        res
    })??;

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
