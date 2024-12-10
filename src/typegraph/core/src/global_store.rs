// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::{self, Result, TgError};
use crate::runtimes::{
    DenoMaterializer, Materializer, MaterializerData, MaterializerDenoModule, Runtime,
};
use crate::types::type_ref::TypeRef;
use crate::types::{
    AsTypeDefEx as _, NamedTypeRef, Type, TypeDef, TypeDefExt, TypeId, TypeRefBuilder,
};
use crate::wit::core::{Policy as CorePolicy, PolicyId, RuntimeId};
use crate::wit::utils::Auth as WitAuth;

#[allow(unused)]
use crate::wit::runtimes::{Effect, MaterializerDenoPredefined, MaterializerId};
use graphql_parser::parse_query;
use indexmap::IndexMap;
use std::rc::Rc;
use std::{cell::RefCell, collections::HashMap};

const PLACEHOLDER_TYPE_SUFFIX: &str = "_____PLACEHOLDER_____";

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
    deno_modules: usize,
}

#[derive(Default)]
pub struct Store {
    pub types: Vec<Type>,
    // the bool indicates weather the name was from
    // user or generated placeholder (false)
    pub type_by_names: IndexMap<Rc<str>, (NamedTypeRef, bool)>,

    pub runtimes: Vec<Runtime>,
    pub materializers: Vec<Materializer>,
    pub policies: Vec<Policy>,

    deno_runtime: RuntimeId,
    predefined_deno_functions: HashMap<String, MaterializerId>,
    deno_modules: IndexMap<String, MaterializerId>,

    public_policy_id: PolicyId,

    prisma_migration_runtime: RuntimeId,
    typegate_runtime: RuntimeId,
    typegraph_runtime: RuntimeId,
    graphql_endpoints: Vec<String>,
    auths: Vec<common::typegraph::Auth>,

    random_seed: Option<u32>,
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
                        name: "pass".to_string(),
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
    pub static SDK_VERSION: String = "0.5.0-rc.7".to_owned();
}

fn with_store<T, F: FnOnce(&Store) -> T>(f: F) -> T {
    STORE.with(|s| f(&s.borrow()))
}

fn with_store_mut<T, F: FnOnce(&mut Store) -> T>(f: F) -> T {
    STORE.with(|s| f(&mut s.borrow_mut()))
}

pub fn get_sdk_version() -> String {
    SDK_VERSION.with(|v| v.clone())
}

#[cfg(test)]
impl Store {
    pub fn reset() {
        let _ = crate::typegraph::serialize(Default::default());
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
            deno_modules: s.deno_modules.len(),
        })
    }

    pub fn restore(saved_state: SavedState) {
        with_store_mut(|s| {
            s.types.truncate(saved_state.types);
            s.type_by_names.truncate(saved_state.type_names);
            s.runtimes.truncate(saved_state.runtimes);
            s.materializers.truncate(saved_state.materializers);
            s.policies.truncate(saved_state.policies);
            s.deno_modules.truncate(saved_state.deno_modules);
        })
    }

    pub fn get_type_by_name(name: &str) -> Option<NamedTypeRef> {
        with_store(|s| s.type_by_names.get(name).map(|id| id.0.clone()))
    }

    pub fn register_type_ref(builder: TypeRefBuilder) -> Result<TypeRef> {
        let id = with_store(|s| s.types.len()) as u32;
        let type_ref = builder.with_id(id.into());
        let res = type_ref.clone();

        // very hacky solution where we keep track of
        // explicitly named types in user_named_types
        // we generate names for everything else to
        // allow the ref system to work
        match &type_ref {
            TypeRef::Named(name_ref) => {
                let (type_ref, name_ref, name, user_named) =
                    if name_ref.name.ends_with(PLACEHOLDER_TYPE_SUFFIX) {
                        let name = name_ref.name.strip_suffix(PLACEHOLDER_TYPE_SUFFIX).unwrap();
                        let name_ref = NamedTypeRef {
                            id: name_ref.id,
                            name: name.into(),
                            target: name_ref.target.clone(),
                        };
                        (
                            TypeRef::Named(name_ref.clone()),
                            name_ref,
                            name.to_string().into(),
                            false,
                        )
                    } else {
                        (
                            type_ref.clone(),
                            name_ref.clone(),
                            name_ref.name.clone(),
                            true,
                        )
                    };
                let res = type_ref.clone();
                with_store_mut(move |s| -> Result<()> {
                    s.types.push(Type::Ref(type_ref));
                    Ok(())
                })?;
                Self::register_type_name(name, name_ref, user_named)?;
                Ok(res)
            }
            _ => {
                with_store_mut(move |s| -> Result<()> {
                    s.types.push(Type::Ref(type_ref));
                    Ok(())
                })?;
                Ok(res)
            }
        }
    }

    pub fn register_type_def(build: impl FnOnce(TypeId) -> TypeDef) -> Result<TypeId> {
        // this works since the store is thread local
        let id = with_store(|s| s.types.len()) as u32;
        let type_def = build(id.into());

        // // very hacky solution where we keep track of
        // // explicitly named types in user_named_types
        // // we generate names for everything else to
        // // allow the ref system to work
        // if name_registration.0 {
        //     if let Some(name) = type_def.base().name.clone() {
        //         Self::register_type_name(name, type_def.clone(), true)?;
        //     } else {
        //         // we only need to assign temporary non-user named
        //         // types for lists and optionals. other refs
        //         // will need explicit names by the user
        //         match type_def {
        //             TypeDef::List(_) | TypeDef::Optional(_) => {
        //                 let variant = type_def.variant_name();
        //                 let placeholder_name = format!("{variant}_{id}");
        //                 Self::register_type_name(&placeholder_name, type_def.clone(), false)?;
        //                 let mut base = type_def.base().clone();
        //                 base.name = Some(placeholder_name);
        //                 type_def = type_def.with_base(id.into(), base);
        //             }
        //             _ => {}
        //         }
        //     }
        // }

        {
            let type_def = type_def.clone();
            with_store_mut(move |s| -> Result<()> {
                s.types.push(Type::Def(type_def));
                Ok(())
            })?;
        }

        let type_id: TypeId = id.into();
        match type_def {
            TypeDef::List(_) | TypeDef::Optional(_) => {
                let variant = type_def.variant_name();
                let placeholder_name = format!("{variant}_{id}{PLACEHOLDER_TYPE_SUFFIX}");
                let type_ref = TypeRef::named(placeholder_name, Type::Def(type_def)).register()?;
                Ok(type_ref.id())
            }
            _ => Ok(type_id),
        }
    }

    pub fn register_type_name(
        name: Rc<str>,
        name_ref: NamedTypeRef,
        user_named: bool,
    ) -> Result<()> {
        with_store_mut(move |s| -> Result<()> {
            if s.type_by_names.contains_key(&name) {
                return Err(format!("type with name {:?} already exists", name).into());
            }
            s.type_by_names.insert(name, (name_ref, user_named));
            Ok(())
        })
    }

    pub fn is_user_named(name: &str) -> Option<bool> {
        with_store(|s| {
            let (_id, user_named) = s.type_by_names.get(name)?;
            Some(*user_named)
        })
    }

    pub fn get_random_seed() -> Option<u32> {
        with_store(|store| store.random_seed)
    }

    pub fn set_random_seed(value: Option<u32>) {
        with_store_mut(|store| store.random_seed = value)
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

    pub fn get_deno_module(file: String, deps: Vec<String>) -> MaterializerId {
        if let Some(mat) = with_store(|s| s.deno_modules.get(&file).cloned()) {
            mat
        } else {
            let runtime_id = Store::get_deno_runtime();
            let mat = Store::register_materializer(Materializer {
                runtime_id,
                effect: Effect::Read, // N/A
                data: Rc::new(DenoMaterializer::Module(MaterializerDenoModule {
                    file: file.clone(),
                    deps: deps.clone(),
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

/// Generate a pub fn for asserting/unwrapping a Type as a specific TypeDef variant
/// e.g.: `as_variant!(Struct)` gives
/// ```rust
/// pub fn as_struct(&self) -> Result<Rc<Struct>> {
///     match self.as_type()? {
///         Type::Def(TypeDef::Struct(inner)) => Ok(inner),
///         Type::Ref(type_ref) => type_ref.try_resolve()?.id().as_struct(),
///         _ => Err(errors::invalid_type("Struct", &self.repr()?)),
///     }
/// }
/// ```
macro_rules! as_variant {
    ($variant:ident) => {
        paste::paste! {
            pub fn [<as_ $variant:lower>](&self) -> Result<Rc<crate::types::[<$variant>]>> {
                use crate::types::AsTypeDefEx as _;
                match self.as_type()? {
                    Type::Def(TypeDef::$variant(inner)) => Ok(inner),
                    Type::Ref(_) => self.as_xdef()?.type_def.id().[<as_ $variant:lower>](),
                    _ => Err(errors::invalid_type(stringify!($variant), &self.repr()?)),
                }
            }
        }
    };
}

impl TryFrom<TypeId> for Type {
    type Error = TgError;

    fn try_from(type_id: TypeId) -> Result<Self> {
        type_id.as_type()
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

    as_variant!(Struct);
    as_variant!(List);

    pub fn is_func(&self) -> Result<bool> {
        Ok(matches!(self.as_xdef()?.type_def, TypeDef::Func(_)))
    }

    pub fn resolve_quant(&self) -> Result<TypeId> {
        let type_id = *self;
        match type_id.as_xdef()?.type_def {
            TypeDef::List(a) => Ok(a.data.of.into()),
            TypeDef::Optional(o) => Ok(o.data.of.into()),
            _ => Ok(type_id),
        }
    }

    pub fn resolve_optional(&self) -> Result<TypeId> {
        let type_id = *self;
        match type_id.as_xdef()?.type_def {
            TypeDef::Optional(o) => Ok(o.data.of.into()),
            _ => Ok(type_id),
        }
    }
}
