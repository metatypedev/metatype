// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::{self, Result};
use crate::runtimes::{
    DenoMaterializer, Materializer, MaterializerData, MaterializerDenoModule, Runtime,
};
use crate::types::type_ref::TypeRef;
use crate::types::{Struct, Type, TypeDef, TypeDefExt, TypeId};
use crate::wit::core::{Policy as CorePolicy, PolicyId, RuntimeId};
use crate::wit::utils::Auth as WitAuth;

use crate::wit::runtimes::{Effect, MaterializerDenoPredefined, MaterializerId};
use graphql_parser::parse_query;
use indexmap::IndexMap;
use std::rc::Rc;
use std::{cell::RefCell, collections::HashMap};

pub type Policy = Rc<CorePolicy>;

/// As all the store entries are append only, we can set a restore point
/// to reset it to a previous state.
/// This is useful to remove the entities that were added in a typegraph scope
/// instead of the global scope.
///
/// The state is saved as item count for each entry.
///
/// With this feature, we can reuse a type name in a typegraph definition module,
/// within different typegraph contexts.
#[derive(Default, Debug)]
pub struct SavedState {
    types: usize,
    type_names: usize,
    runtimes: usize,
    materializers: usize,
    policies: usize,
}

#[derive(Default)]
pub struct Store {
    pub types: Vec<Type>,
    pub type_by_names: IndexMap<String, TypeId>,

    pub runtimes: Vec<Runtime>,
    pub materializers: Vec<Materializer>,
    pub policies: Vec<Policy>,

    deno_runtime: RuntimeId,
    predefined_deno_functions: HashMap<String, MaterializerId>,
    deno_modules: HashMap<String, MaterializerId>,

    public_policy_id: PolicyId,

    prisma_migration_runtime: RuntimeId,
    typegate_runtime: RuntimeId,
    typegraph_runtime: RuntimeId,
    graphql_endpoints: Vec<String>,
    auths: Vec<common::typegraph::Auth>,
}

impl Store {
    fn new() -> Self {
        let deno_runtime = 0;
        Self {
            runtimes: vec![
                Runtime::Deno,
                Runtime::PrismaMigration,
                Runtime::Typegate,
                Runtime::Typegraph,
            ],
            deno_runtime,
            prisma_migration_runtime: 1,
            typegate_runtime: 2,
            typegraph_runtime: 3,

            materializers: vec![Materializer {
                runtime_id: deno_runtime,
                effect: Effect::Read,
                data: MaterializerData::Deno(Rc::new(DenoMaterializer::Predefined(
                    crate::wit::runtimes::MaterializerDenoPredefined {
                        name: "true".to_string(),
                    },
                ))),
            }],

            policies: vec![Rc::new(CorePolicy {
                name: "__public".to_string(),
                materializer: 0,
            })],
            public_policy_id: 0,
            ..Default::default()
        }
    }
}

const PREDEFINED_DENO_FUNCTIONS: &[&str] = &["identity", "true"];

thread_local! {
    pub static STORE: RefCell<Store> = RefCell::new(Store::new());
}

fn with_store<T, F: FnOnce(&Store) -> T>(f: F) -> T {
    STORE.with(|s| f(&s.borrow()))
}

fn with_store_mut<T, F: FnOnce(&mut Store) -> T>(f: F) -> T {
    STORE.with(|s| f(&mut s.borrow_mut()))
}

/// Option to register or not a type name.
/// Should be disabled for type extensions, because they inherit the name.
pub struct NameRegistration(pub bool);

#[cfg(test)]
impl Store {
    pub fn reset() {
        let _ = crate::typegraph::finalize();
        with_store_mut(|s| *s = Store::new());
    }
}

impl Store {
    pub fn save() -> SavedState {
        with_store(|s| SavedState {
            types: s.types.len(),
            type_names: s.type_by_names.len(),
            runtimes: s.runtimes.len(),
            materializers: s.materializers.len(),
            policies: s.policies.len(),
        })
    }

    pub fn restore(saved_state: SavedState) {
        with_store_mut(|s| {
            s.types.truncate(saved_state.types);
            s.type_by_names.truncate(saved_state.type_names);
            s.runtimes.truncate(saved_state.runtimes);
            s.materializers.truncate(saved_state.materializers);
            s.policies.truncate(saved_state.policies);
        })
    }

    pub fn get_type_by_name(name: &str) -> Option<TypeId> {
        with_store(|s| s.type_by_names.get(name).copied())
    }

    pub fn register_type_ref(name: String, attributes: Vec<(String, String)>) -> Result<TypeId> {
        let id = with_store(|s| s.types.len()) as u32;
        let type_ref = TypeRef::new(id.into(), name, attributes);

        with_store_mut(move |s| -> Result<()> {
            s.types.push(Type::Ref(type_ref));
            Ok(())
        })?;

        Ok(id.into())
    }

    pub fn register_type_def(
        build: impl FnOnce(TypeId) -> TypeDef,
        name_registration: NameRegistration,
    ) -> Result<TypeId> {
        // this works since the store is thread local
        let id = with_store(|s| s.types.len()) as u32;
        let type_def = build(id.into());

        if name_registration.0 {
            if let Some(name) = type_def.base().name.clone() {
                Self::register_type_name(name, id.into())?;
            }
        }

        with_store_mut(move |s| -> Result<()> {
            s.types.push(Type::Def(type_def));
            Ok(())
        })?;
        Ok(id.into())
    }

    pub fn register_type_name(name: impl Into<String>, id: TypeId) -> Result<()> {
        let name = name.into();
        with_store_mut(move |s| -> Result<()> {
            if s.type_by_names.contains_key(&name) {
                return Err(format!("type with name {:?} already exists", name).into());
            }
            s.type_by_names.insert(name, id);
            Ok(())
        })
    }

    pub fn pick_branch_by_path(supertype_id: TypeId, path: &[String]) -> Result<(Type, TypeId)> {
        let (_, supertype) = supertype_id.resolve_ref()?;
        let supertype = &supertype;
        let filter_and_reduce = |variants: Vec<u32>| match path.len() {
            0 => Ok((Type::Def(supertype.clone()), supertype_id)), // terminal node
            _ => {
                let mut compatible = vec![];
                let mut failures = vec![];
                let chunk = path.first().unwrap();
                for (i, variant) in variants.iter().enumerate() {
                    let variant: TypeId = variant.into();
                    let (_, type_def) = variant.resolve_ref()?;
                    match type_def {
                        TypeDef::Struct(t) => {
                            for (prop_name, prop_id) in t.iter_props() {
                                if prop_name.eq(chunk) {
                                    // variant is compatible with the path
                                    // try expanding it, if it fails, just skip
                                    match Store::get_type_by_path(prop_id, &path[1..]) {
                                        Ok((_, solution)) => compatible.push(solution),
                                        Err(e) => failures.push(format!(
                                            "[v{i} → {prop_name}]: {}",
                                            e.stack.first().unwrap().clone()
                                        )),
                                    }
                                }
                            }
                        }
                        TypeDef::Either(..) | TypeDef::Union(..) => {
                            // get_type_by_path => pick_branch_by_path
                            match Store::get_type_by_path(variant, &path[1..]) {
                                Ok((_, solution)) => compatible.push(solution),
                                Err(e) => failures
                                    .push(format!("[v{i}]: {}", e.stack.first().unwrap().clone())),
                            }
                        }
                        _ => {} // skip
                    }
                }

                if compatible.is_empty() {
                    return Err(format!(
                        "unable to expand variant with **.{}\nDetails:\n{}",
                        path.join("."),
                        failures.join("\n")
                    )
                    .into());
                }

                let first = compatible.first().unwrap().to_owned();
                let ret_id = match &supertype {
                    TypeDef::Union(..) => first,
                    TypeDef::Either(..) => {
                        if compatible.len() > 1 {
                            return Err(format!(
                                    "either node with more than one compatible variant encountered at path **.{}",
                                    path.join("."),
                                ).into(),
                            );
                        }
                        first
                    }
                    _ => {
                        return Err("invalid state: either or union expected as supertype".into());
                    }
                };

                Ok((ret_id.as_type()?, ret_id))
            }
        };

        match supertype {
            TypeDef::Either(t) => filter_and_reduce(t.data.variants.clone()),
            TypeDef::Union(t) => filter_and_reduce(t.data.variants.clone()),
            _ => Store::get_type_by_path(supertype_id, path), // no branching, trivial case
        }
    }

    pub fn get_type_by_path(struct_id: TypeId, path: &[String]) -> Result<(Type, TypeId)> {
        let mut ret = (struct_id.as_type()?, struct_id);

        let mut curr_path = vec![];
        for (pos, chunk) in path.iter().enumerate() {
            let (_, type_def) = ret.1.resolve_ref()?;
            let type_def = type_def.resolve_quantifier()?;
            match &type_def {
                TypeDef::Struct(t) => {
                    let result = t.data.props.iter().find(|(k, _)| k.eq(chunk));
                    curr_path.push(chunk.clone());
                    ret = match result {
                        Some((_, id)) => (TypeId(*id).as_type()?, id.to_owned().into()),
                        None => {
                            return Err(errors::invalid_path(
                                pos,
                                path,
                                &t.data
                                    .props
                                    .iter()
                                    .map(|v| format!("{:?}", v.0.clone()))
                                    .collect::<Vec<String>>(),
                            ));
                        }
                    };
                }
                TypeDef::Union(..) | TypeDef::Either(..) => {
                    ret = Store::pick_branch_by_path(type_def.id(), &path[pos..])?;
                    break;
                }
                _ => return Err(errors::expect_object_at_path(&curr_path, &type_def.repr())),
            }
        }

        Ok(ret)
    }

    pub fn register_runtime(rt: Runtime) -> RuntimeId {
        with_store_mut(|s| {
            let id = s.runtimes.len() as u32;
            s.runtimes.push(rt);
            id
        })
    }

    pub fn get_runtime(id: RuntimeId) -> Result<Runtime> {
        with_store(|s| {
            s.runtimes
                .get(id as usize)
                .cloned()
                .ok_or_else(|| errors::object_not_found("runtime", id))
        })
    }

    pub fn get_deno_runtime() -> RuntimeId {
        with_store(|s| s.deno_runtime)
    }

    pub fn get_prisma_migration_runtime() -> RuntimeId {
        with_store(|s| s.prisma_migration_runtime)
    }

    pub fn get_typegate_runtime() -> RuntimeId {
        with_store(|s| s.typegate_runtime)
    }

    pub fn get_typegraph_runtime() -> RuntimeId {
        with_store(|s| s.typegraph_runtime)
    }

    pub fn register_materializer(mat: Materializer) -> MaterializerId {
        with_store_mut(|s| {
            let id = s.materializers.len() as u32;
            s.materializers.push(mat);
            id
        })
    }

    pub fn get_materializer(id: MaterializerId) -> Result<Materializer> {
        with_store(|s| {
            s.materializers
                .get(id as usize)
                .cloned()
                .ok_or_else(|| errors::object_not_found("materializer", id))
        })
    }

    pub fn register_policy(policy: Policy) -> Result<PolicyId> {
        with_store_mut(|s| {
            let id = s.policies.len() as u32;
            if s.policies.iter().any(|p| p.name == policy.name) {
                Err(errors::duplicate_policy_name(&policy.name))
            } else {
                s.policies.push(policy);
                Ok(id)
            }
        })
    }

    pub fn get_policy(id: PolicyId) -> Result<Policy> {
        with_store(|s| {
            s.policies
                .get(id as usize)
                .cloned()
                .ok_or_else(|| errors::object_not_found("policy", id))
        })
    }

    pub fn get_public_policy_id() -> PolicyId {
        with_store(|s| s.public_policy_id)
    }

    pub fn get_predefined_deno_function(name: String) -> Result<MaterializerId> {
        if let Some(mat) = with_store(|s| s.predefined_deno_functions.get(&name).cloned()) {
            Ok(mat)
        } else if !PREDEFINED_DENO_FUNCTIONS.iter().any(|n| n == &name) {
            Err(errors::unknown_predefined_function(&name, "deno"))
        } else {
            let runtime_id = Store::get_deno_runtime();
            let mat = Store::register_materializer(Materializer {
                runtime_id,
                effect: Effect::Read,
                data: Rc::new(DenoMaterializer::Predefined(MaterializerDenoPredefined {
                    name: name.clone(),
                }))
                .into(),
            });
            with_store_mut(|s| {
                s.predefined_deno_functions.insert(name, mat);
            });
            Ok(mat)
        }
    }

    pub fn get_deno_module(file: String) -> MaterializerId {
        if let Some(mat) = with_store(|s| s.deno_modules.get(&file).cloned()) {
            mat
        } else {
            let runtime_id = Store::get_deno_runtime();
            let mat = Store::register_materializer(Materializer {
                runtime_id,
                effect: Effect::Read, // N/A
                data: Rc::new(DenoMaterializer::Module(MaterializerDenoModule {
                    file: file.clone(),
                }))
                .into(),
            });
            with_store_mut(|s| s.deno_modules.insert(file, mat));
            mat
        }
    }

    pub fn add_graphql_endpoint(graphql: String) -> Result<u32> {
        with_store_mut(|s| {
            let ast = parse_query::<&str>(&graphql).map_err(|e| e.to_string())?;
            let endpoints = ast
                .definitions
                .into_iter()
                .map(|op| {
                    format!("{}", op)
                        .split_whitespace()
                        .collect::<Vec<_>>()
                        .join(" ")
                })
                .collect::<Vec<_>>();

            s.graphql_endpoints.extend(endpoints);
            Ok(s.graphql_endpoints.len() as u32)
        })
    }

    pub fn get_graphql_endpoints() -> Vec<String> {
        with_store(|s| s.graphql_endpoints.clone())
    }

    pub fn add_auth(auth: WitAuth) -> Result<u32> {
        with_store_mut(|s| {
            let auth = auth.convert()?;
            s.auths.push(auth);
            Ok(s.auths.len() as u32)
        })
    }

    pub fn add_raw_auth(auth: common::typegraph::Auth) -> Result<u32> {
        with_store_mut(|s| {
            s.auths.push(auth);
            Ok(s.auths.len() as u32)
        })
    }

    pub fn get_auths() -> Vec<common::typegraph::Auth> {
        with_store(|s| s.auths.clone())
    }
}

impl TypeId {
    pub fn as_type(&self) -> Result<Type> {
        with_store(|s| {
            s.types
                .get(self.0 as usize)
                .cloned()
                .ok_or_else(|| errors::object_not_found("type", self.0))
        })
    }

    pub fn as_struct(&self) -> Result<Rc<Struct>> {
        match self.as_type()? {
            Type::Def(TypeDef::Struct(inner)) => Ok(inner),
            Type::Ref(type_ref) => type_ref.try_resolve()?.id().as_struct(),
            _ => Err(errors::invalid_type("Struct", &self.repr()?)),
        }
    }

    pub fn is_func(&self) -> Result<bool> {
        Ok(matches!(self.as_type_def()?, Some(TypeDef::Func(_))))
    }

    pub fn resolve_quant(&self) -> Result<TypeId> {
        let type_id = *self;
        match type_id.as_type_def()? {
            Some(TypeDef::List(a)) => Ok(a.data.of.into()),
            Some(TypeDef::Optional(o)) => Ok(o.data.of.into()),
            _ => Ok(type_id),
        }
    }
}
