// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod conversion;
mod errors;
mod global_store;
mod logger;
mod params;
mod runtimes;
mod t;
mod typedef;
mod typegraph;
mod types;
mod utils;
mod validation;

#[cfg(test)]
mod test_utils;

use std::collections::HashSet;

use common::typegraph::Injection;
use errors::{Result, TgError};
use global_store::Store;
use indoc::formatdoc;
use params::apply;
use regex::Regex;
use runtimes::{DenoMaterializer, Materializer};
use types::type_ref::AsId;
use types::{
    AsTypeDefEx as _, Boolean, Either, File, Float, Func, Integer, List, Named, Optional, StringT,
    Struct, TypeBoolean, TypeDef, TypeId, TypeRef, Union, WithInjection as _, WithPolicy as _,
    WithRuntimeConfig as _,
};

use wit::core::{
    Artifact, ContextCheck, Policy, PolicyId, PolicySpec, SerializeParams, TransformData,
    TypeEither, TypeFile, TypeFloat, TypeFunc, TypeId as CoreTypeId, TypeInteger, TypeList,
    TypeOptional, TypeString, TypeStruct, TypeUnion, TypegraphInitParams,
};
use wit::runtimes::{Guest, MaterializerDenoFunc};

pub mod wit {
    wit_bindgen::generate!({

        world: "typegraph"
    });
    use crate::Lib;
    pub use exports::metatype::typegraph::{aws, core, runtimes, utils};
    export!(Lib);
}

pub struct Lib {}

impl wit::core::Guest for Lib {
    fn init_typegraph(params: TypegraphInitParams) -> Result<()> {
        typegraph::init(params)
    }

    fn serialize_typegraph(res_config: SerializeParams) -> Result<(String, Vec<Artifact>)> {
        typegraph::serialize(res_config)
    }

    fn refb(name: String, attr: Option<String>) -> Result<CoreTypeId> {
        Ok(TypeRef::indirect(
            name,
            attr.map(|attr| {
                serde_json::from_str(&attr)
                    .map_err(|e| format!("Could not parse ref attributes: {e:?}"))
            })
            .transpose()?,
        )
        .register()?
        .id()
        .0)
    }

    fn integerb(data: TypeInteger) -> Result<CoreTypeId> {
        if let (Some(min), Some(max)) = (data.min, data.max) {
            if min >= max {
                return Err(errors::invalid_max_value());
            }
        }
        if let (Some(min), Some(max)) = (data.exclusive_minimum, data.exclusive_maximum) {
            if min >= max {
                return Err(errors::invalid_max_value());
            }
        }
        Ok(Store::register_type_def(|id| TypeDef::Integer(Integer { id, data }.into()))?.into())
    }

    fn floatb(data: TypeFloat) -> Result<CoreTypeId> {
        if let (Some(min), Some(max)) = (data.min, data.max) {
            if min >= max {
                return Err(errors::invalid_max_value());
            }
        }
        if let (Some(min), Some(max)) = (data.exclusive_minimum, data.exclusive_maximum) {
            if min >= max {
                return Err(errors::invalid_max_value());
            }
        }
        Ok(Store::register_type_def(|id| TypeDef::Float(Float { id, data }.into()))?.into())
    }

    fn booleanb() -> Result<CoreTypeId> {
        Ok(Store::register_type_def(|id| {
            TypeDef::Boolean(
                Boolean {
                    id,
                    data: TypeBoolean,
                }
                .into(),
            )
        })?
        .into())
    }

    fn stringb(data: TypeString) -> Result<CoreTypeId> {
        if let (Some(min), Some(max)) = (data.min, data.max) {
            if min >= max {
                return Err(errors::invalid_max_value());
            }
        }
        Ok(Store::register_type_def(|id| TypeDef::String(StringT { id, data }.into()))?.into())
    }

    fn as_id(type_id: CoreTypeId, composite: bool) -> Result<CoreTypeId> {
        TypeId(type_id)
            .as_type()?
            .as_id(composite)
            .map(|t| t.id().0)
    }

    fn fileb(data: TypeFile) -> Result<CoreTypeId> {
        if let (Some(min), Some(max)) = (data.min, data.max) {
            if min >= max {
                return Err(errors::invalid_max_value());
            }
        }
        Ok(Store::register_type_def(|id| TypeDef::File(File { id, data }.into()))?.into())
    }

    fn listb(data: TypeList) -> Result<CoreTypeId> {
        if let (Some(min), Some(max)) = (data.min, data.max) {
            if min > max {
                return Err(errors::invalid_max_value());
            }
        }
        Ok(Store::register_type_def(|id| TypeDef::List(List { id, data }.into()))?.into())
    }

    fn optionalb(data: TypeOptional) -> Result<CoreTypeId> {
        /* let inner_name = match base.name {
            Some(_) => None,
            None => TypeId(data.of).name()?,
        }; */
        Ok(Store::register_type_def(|id| TypeDef::Optional(Optional { id, data }.into()))?.into())
    }

    fn unionb(data: TypeUnion) -> Result<CoreTypeId> {
        Ok(Store::register_type_def(|id| TypeDef::Union(Union { id, data }.into()))?.into())
    }

    fn eitherb(data: TypeEither) -> Result<CoreTypeId> {
        Ok(Store::register_type_def(|id| TypeDef::Either(Either { id, data }.into()))?.into())
    }

    fn structb(data: TypeStruct) -> Result<CoreTypeId> {
        let mut prop_names = HashSet::new();
        for (name, _) in data.props.iter() {
            if prop_names.contains(name) {
                return Err(errors::duplicate_key(name));
            }
            prop_names.insert(name.clone());
        }

        Ok(Store::register_type_def(|id| TypeDef::Struct(Struct { id, data }.into()))?.into())
    }

    fn extend_struct(
        type_id: CoreTypeId,
        new_props: Vec<(String, CoreTypeId)>,
    ) -> Result<CoreTypeId> {
        let type_def = TypeId(type_id).as_struct()?;
        let mut props = type_def.data.props.clone();
        props.extend(new_props);

        Ok(Store::register_type_def(|id| {
            TypeDef::Struct(
                Struct {
                    id,
                    data: TypeStruct {
                        props,
                        ..type_def.data.clone()
                    },
                }
                .into(),
            )
        })?
        .into())
    }

    fn funcb(data: TypeFunc) -> Result<CoreTypeId> {
        let wrapper_type = TypeId(data.inp);
        if !matches!(&wrapper_type.as_xdef()?.type_def, TypeDef::Struct(_)) {
            return Err(errors::invalid_input_type(&wrapper_type.repr()?));
        }

        Ok(Store::register_type_def(|id| TypeDef::Func(Func { id, data }.into()))?.into())
    }

    fn get_transform_data(
        resolver_input: CoreTypeId,
        transform_tree: String,
    ) -> Result<TransformData> {
        apply::build_transform_data(
            resolver_input.into(),
            &serde_json::from_str(&transform_tree).map_err(|e| -> TgError {
                format!("Error while parsing transform tree: {e:?}").into()
            })?,
        )
    }

    fn with_injection(type_id: CoreTypeId, injection: String) -> Result<CoreTypeId> {
        // validation
        let injection: Injection =
            serde_json::from_str(&injection).map_err(|e| errors::TgError::from(e.to_string()))?;
        Ok(TypeId(type_id).with_injection(injection)?.id().into())
    }

    fn with_config(type_id: CoreTypeId, config: String) -> Result<CoreTypeId> {
        let config: serde_json::Value =
            serde_json::from_str(&config).map_err(|e| errors::TgError::from(e.to_string()))?;
        Ok(TypeId(type_id).with_config(config)?.id().into())
    }

    fn with_policy(type_id: CoreTypeId, policy_chain: Vec<PolicySpec>) -> Result<CoreTypeId> {
        let policy_chain = policy_chain
            .into_iter()
            .map(|p| p.into())
            .collect::<Vec<_>>();
        Ok(TypeId(type_id).with_policy(policy_chain)?.id().into())
    }

    fn register_policy(pol: Policy) -> Result<PolicyId> {
        Store::register_policy(pol.into())
    }

    fn get_public_policy() -> Result<(PolicyId, String)> {
        Ok({
            let policy_id = Store::get_public_policy_id();
            let policy = Store::get_policy(policy_id)?;
            (policy_id, policy.name.clone())
        })
    }

    fn get_internal_policy() -> Result<(PolicyId, String)> {
        let deno_mat = DenoMaterializer::Predefined(wit::runtimes::MaterializerDenoPredefined {
            name: "internal_policy".to_string(),
        });
        let mat = Materializer::deno(deno_mat, crate::wit::runtimes::Effect::Read);
        let policy_id = Store::register_policy(
            Policy {
                materializer: Store::register_materializer(mat),
                name: "__internal".to_string(),
            }
            .into(),
        )?;
        Ok({
            let policy = Store::get_policy(policy_id)?;
            (policy_id, policy.name.clone())
        })
    }

    fn register_context_policy(key: String, check: ContextCheck) -> Result<(PolicyId, String)> {
        let name = match &check {
            ContextCheck::NotNull => format!("__ctx_{}", key),
            ContextCheck::Value(v) => format!("__ctx_{}_{}", key, v),
            ContextCheck::Pattern(p) => format!("__ctx_p_{}_{}", key, p),
        };
        let name = Regex::new("[^a-zA-Z0-9_]")
            .unwrap()
            .replace_all(&name, "_")
            .to_string();

        let check = match check {
            ContextCheck::NotNull => "value != null".to_string(),
            ContextCheck::Value(val) => {
                format!("value === {}", serde_json::to_string(&val).unwrap())
            }
            ContextCheck::Pattern(pattern) => {
                format!(
                    "new RegExp({}).test(value)",
                    serde_json::to_string(&pattern).unwrap()
                )
            }
        };

        let key = serde_json::to_string(&key).unwrap();

        let code = formatdoc! {r#"
            (_, {{ context }}) => {{
                const chunks = {key}.split(".");
                let value = context;
                for (const chunk of chunks) {{
                    value = value?.[chunk];
                }}
                return {check};
            }}
        "# };

        let mat_id = Lib::register_deno_func(
            MaterializerDenoFunc {
                code,
                secrets: vec![],
            },
            wit::runtimes::Effect::Read,
        )?;

        Lib::register_policy(Policy {
            name: name.clone(),
            materializer: mat_id,
        })
        .map(|id| (id, name))
    }

    fn rename_type(type_id: CoreTypeId, new_name: String) -> Result<CoreTypeId, wit::core::Error> {
        TypeId(type_id).named(new_name).map(|t| t.id().0)
    }

    fn get_type_repr(type_id: CoreTypeId) -> Result<String> {
        TypeId(type_id).repr()
    }

    fn expose(
        fns: Vec<(String, CoreTypeId)>,
        default_policy: Option<Vec<PolicySpec>>,
    ) -> Result<()> {
        typegraph::expose(
            fns.into_iter().map(|(k, ty)| (k, ty.into())).collect(),
            default_policy,
        )
    }

    fn set_seed(seed: Option<u32>) -> Result<()> {
        typegraph::set_seed(seed)
    }
}

#[macro_export]
macro_rules! log {
    ($($arg:tt)*) => {
        $crate::host::abi::log(&format!($($arg)*));
    }
}

#[cfg(test)]
mod tests {
    use crate::errors::{self, Result};
    use crate::global_store::Store;
    use crate::t::{self, TypeBuilder};
    use crate::test_utils::setup;
    use crate::wit::core::{Cors, Guest, MigrationAction, PrismaMigrationConfig, SerializeParams};
    use crate::wit::runtimes::{Effect, Guest as GuestRuntimes, MaterializerDenoFunc};
    use crate::Lib;
    use crate::TypegraphInitParams;

    impl Default for TypegraphInitParams {
        fn default() -> Self {
            Self {
                name: "".to_string(),
                dynamic: None,
                path: ".".to_string(),
                prefix: None,
                cors: Cors {
                    allow_origin: vec![],
                    allow_headers: vec![],
                    expose_headers: vec![],
                    allow_methods: vec![],
                    allow_credentials: false,
                    max_age_sec: None,
                },
                rate: None,
            }
        }
    }

    impl Default for SerializeParams {
        fn default() -> Self {
            Self {
                typegraph_path: "some/dummy/path".to_string(),
                prefix: None,
                artifact_resolution: false,
                codegen: false,
                pretty: true,
                prisma_migration: PrismaMigrationConfig {
                    migrations_dir: "".to_string(),
                    migration_actions: vec![],
                    default_migration_action: MigrationAction {
                        apply: false,
                        create: false,
                        reset: false,
                    },
                },
            }
        }
    }

    #[test]
    fn test_integer_invalid_max() {
        let res = t::integer().min(12).max(10).build();
        assert_eq!(res, Err(errors::invalid_max_value()));
        let res = t::integer().x_min(12).x_max(12).build();
        assert_eq!(res, Err(errors::invalid_max_value()));
    }

    #[test]
    fn test_number_invalid_max() {
        let res = t::float().min(12.34).max(12.3399).build();
        assert_eq!(res, Err(errors::invalid_max_value()));
        let res = t::float().x_min(12.34).x_max(12.34).build();
        assert_eq!(res, Err(errors::invalid_max_value()));
    }

    #[test]
    fn test_struct_duplicate_key() -> Result<()> {
        let res = t::struct_()
            .prop("one", t::integer().build()?)
            .prop("two", t::integer().build()?)
            .prop("one", t::integer().build()?)
            .build();
        assert_eq!(res, Err(errors::duplicate_key("one")));
        Ok(())
    }

    #[test]
    fn test_invalid_input_type() -> Result<()> {
        let mat =
            Lib::register_deno_func(MaterializerDenoFunc::with_code("() => 12"), Effect::Read)?;
        let inp = t::integer().build()?;
        let res = t::func(inp, t::integer().build()?, mat);

        assert_eq!(res, Err(errors::invalid_input_type(&inp.repr()?)),);
        Ok(())
    }

    #[test]
    fn test_nested_typegraph_context() -> Result<()> {
        Store::reset();
        setup(Some("test-1"))?;
        assert_eq!(
            crate::test_utils::setup(Some("test-2")),
            Err(errors::nested_typegraph_context("test-1"))
        );
        Lib::serialize_typegraph(Default::default())?;
        Ok(())
    }

    #[test]
    fn test_no_active_context() -> Result<()> {
        Store::reset();
        assert_eq!(
            Lib::expose(vec![], None),
            Err(errors::expected_typegraph_context())
        );

        assert!(
            matches!(Lib::serialize_typegraph(Default::default()), Err(e) if e == errors::expected_typegraph_context())
        );

        Ok(())
    }

    #[test]
    fn test_expose_invalid_type() -> Result<()> {
        Store::reset();
        setup(None)?;
        let tpe = t::integer().build()?;
        let res = Lib::expose(vec![("one".to_string(), tpe.into())], None);

        assert_eq!(res, Err(errors::invalid_export_type("one", &tpe.repr()?,)));

        Ok(())
    }

    #[test]
    fn test_expose_invalid_name() -> Result<()> {
        setup(None)?;

        let mat = Lib::register_deno_func(
            MaterializerDenoFunc::with_code("() => 12"),
            Effect::default(),
        )?;

        let res = Lib::expose(
            vec![(
                "".to_string(),
                t::func(t::struct_().build()?, t::integer().build()?, mat)?.into(),
            )],
            None,
        );
        assert_eq!(res, Err(errors::invalid_export_name("")));

        let res = Lib::expose(
            vec![(
                "hello_world!".to_string(),
                t::func(t::struct_().build()?, t::integer().build()?, mat)?.into(),
            )],
            None,
        );
        assert_eq!(res, Err(errors::invalid_export_name("hello_world!")));

        Ok(())
    }

    #[test]
    fn test_expose_duplicate() -> Result<()> {
        setup(None)?;

        let mat =
            Lib::register_deno_func(MaterializerDenoFunc::with_code("() => 12"), Effect::Read)?;

        let res = Lib::expose(
            vec![
                (
                    "one".to_string(),
                    t::func(t::struct_().build()?, t::integer().build()?, mat)?.into(),
                ),
                (
                    "one".to_string(),
                    t::func(t::struct_().build()?, t::integer().build()?, mat)?.into(),
                ),
            ],
            None,
        );
        assert_eq!(res, Err(errors::duplicate_export_name("one")));

        Ok(())
    }

    #[test]
    fn test_successful_serialization() -> Result<()> {
        Store::reset();
        let a = t::integer().build()?;
        let b = t::integer().min(12).max(44).build()?;
        // -- optional(list(float))
        let num_idx = t::float().build()?;
        let list_idx = t::list(num_idx).build()?;
        let c = t::optional(list_idx).build()?;
        // --

        let s = t::struct_()
            .prop("one", a)
            .prop("two", b)
            .prop("three", c)
            .build()?;

        setup(None)?;
        let mat =
            Lib::register_deno_func(MaterializerDenoFunc::with_code("() => 12"), Effect::Read)?;
        Lib::expose(vec![("one".to_string(), t::func(s, b, mat)?.into())], None)?;
        let typegraph = Lib::serialize_typegraph(Default::default())?;
        insta::assert_snapshot!(typegraph.0);
        Ok(())
    }
}
