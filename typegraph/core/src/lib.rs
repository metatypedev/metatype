// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod conversion;
mod errors;
mod global_store;
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

use errors::Result;
use global_store::Store;
use indoc::formatdoc;
use regex::Regex;
use runtimes::{DenoMaterializer, Materializer};
use types::{
    Boolean, Either, File, Float, Func, Integer, List, Optional, Proxy, StringT, Struct, Type,
    TypeBoolean, TypeId, Union, WithInjection, WithPolicy,
};
use wit::core::{
    ContextCheck, Policy, PolicyId, PolicySpec, TypeBase, TypeEither, TypeFile, TypeFloat,
    TypeFunc, TypeId as CoreTypeId, TypeInteger, TypeList, TypeOptional, TypePolicy, TypeProxy,
    TypeString, TypeStruct, TypeUnion, TypeWithInjection, TypegraphInitParams,
};
use wit::runtimes::{Guest, MaterializerDenoFunc};

pub mod wit {
    use super::*;

    wit_bindgen::generate!({
        world: "typegraph",
        exports: {
            "metatype:typegraph/core": Lib,
            "metatype:typegraph/runtimes": Lib,
            "metatype:typegraph/utils": Lib,
            "metatype:typegraph/aws": Lib,
        }
    });

    pub use exports::metatype::typegraph::{aws, core, runtimes, utils};
}

pub struct Lib {}

impl wit::core::Guest for Lib {
    fn init_typegraph(params: TypegraphInitParams) -> Result<()> {
        typegraph::init(params)
    }

    fn finalize_typegraph() -> Result<String> {
        typegraph::finalize()
    }

    fn proxyb(data: TypeProxy) -> Result<CoreTypeId> {
        Ok(Store::register_type(|id| Type::Proxy(Proxy { id, data }.into()))?.into())
    }

    fn integerb(data: TypeInteger, base: TypeBase) -> Result<CoreTypeId> {
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
        Ok(Store::register_type(|id| Type::Integer(Integer { id, base, data }.into()))?.into())
    }

    fn floatb(data: TypeFloat, base: TypeBase) -> Result<CoreTypeId> {
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
        Ok(Store::register_type(|id| Type::Float(Float { id, base, data }.into()))?.into())
    }

    fn booleanb(base: TypeBase) -> Result<CoreTypeId> {
        Ok(Store::register_type(|id| {
            Type::Boolean(
                Boolean {
                    id,
                    base,
                    data: TypeBoolean,
                }
                .into(),
            )
        })?
        .into())
    }

    fn stringb(data: TypeString, base: TypeBase) -> Result<CoreTypeId> {
        if let (Some(min), Some(max)) = (data.min, data.max) {
            if min >= max {
                return Err(errors::invalid_max_value());
            }
        }
        Ok(Store::register_type(|id| Type::String(StringT { id, base, data }.into()))?.into())
    }

    fn fileb(data: TypeFile, base: TypeBase) -> Result<CoreTypeId> {
        if let (Some(min), Some(max)) = (data.min, data.max) {
            if min >= max {
                return Err(errors::invalid_max_value());
            }
        }
        Ok(Store::register_type(|id| {
            let base = TypeBase {
                name: Some(format!("_{}_file", id.0)),
                ..base
            };
            Type::File(File { id, base, data }.into())
        })?
        .into())
    }

    fn listb(data: TypeList, base: TypeBase) -> Result<CoreTypeId> {
        if let (Some(min), Some(max)) = (data.min, data.max) {
            if min > max {
                return Err(errors::invalid_max_value());
            }
        }
        let inner_name = match base.name {
            Some(_) => None,
            None => TypeId(data.of).type_name()?,
        };
        Ok(Store::register_type(|id| {
            let base = match inner_name {
                Some(n) => TypeBase {
                    name: Some(format!("_{}_{}[]", id.0, n)),
                    ..base
                },
                None => base,
            };
            Type::List(List { id, base, data }.into())
        })?
        .into())
    }

    fn optionalb(data: TypeOptional, base: TypeBase) -> Result<CoreTypeId> {
        let inner_name = match base.name {
            Some(_) => None,
            None => TypeId(data.of).type_name()?,
        };
        Ok(Store::register_type(|id| {
            let base = match inner_name {
                Some(n) => TypeBase {
                    name: Some(format!("_{}_{}?", id.0, n)),
                    ..base
                },
                None => base,
            };
            Type::Optional(Optional { id, base, data }.into())
        })?
        .into())
    }

    fn unionb(data: TypeUnion, base: TypeBase) -> Result<CoreTypeId> {
        Ok(Store::register_type(|id| Type::Union(Union { id, base, data }.into()))?.into())
    }

    fn eitherb(data: TypeEither, base: TypeBase) -> Result<CoreTypeId> {
        Ok(Store::register_type(|id| Type::Either(Either { id, base, data }.into()))?.into())
    }

    fn structb(data: TypeStruct, base: TypeBase) -> Result<CoreTypeId> {
        let mut prop_names = HashSet::new();
        for (name, _) in data.props.iter() {
            if prop_names.contains(name) {
                return Err(errors::duplicate_key(name));
            }
            prop_names.insert(name.clone());
        }

        Ok(Store::register_type(|id| Type::Struct(Struct { id, base, data }.into()))?.into())
    }

    fn funcb(data: TypeFunc) -> Result<CoreTypeId> {
        let wrapper_type = TypeId(data.inp);
        let attrs = wrapper_type.attrs()?;
        let concrete_type = attrs.concrete_type.as_type()?;
        if !matches!(concrete_type, Type::Struct(_)) {
            return Err(errors::invalid_input_type(&wrapper_type.repr()?));
        }
        let base = TypeBase::default();
        Ok(Store::register_type(|id| Type::Func(Func { id, base, data }.into()))?.into())
    }

    fn with_injection(data: TypeWithInjection) -> Result<CoreTypeId> {
        Ok(
            Store::register_type(|id| Type::WithInjection(WithInjection { id, data }.into()))?
                .into(),
        )
    }

    fn with_policy(data: TypePolicy) -> Result<CoreTypeId> {
        Ok(Store::register_type(|id| Type::WithPolicy(WithPolicy { id, data }.into()))?.into())
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
        let deno_mat = DenoMaterializer::Inline(MaterializerDenoFunc {
            code: "(_, { context }) => context.provider === 'internal'".to_string(),
            secrets: vec![],
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
            ContextCheck::Value(v) => format!("__ctx_{}_{}", key, v),
            ContextCheck::Pattern(p) => format!("__ctx_p_{}_{}", key, p),
        };
        let name = Regex::new("[^a-zA-Z0-9_]")
            .unwrap()
            .replace_all(&name, "_")
            .to_string();

        let check = match check {
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
        let typ = TypeId(type_id).as_type()?;
        match typ {
            Type::Proxy(_) => Err("cannot rename proxy".into()),
            Type::WithPolicy(inner) => Self::with_policy(TypePolicy {
                tpe: Self::rename_type(inner.data.tpe, new_name)?,
                chain: inner.data.chain.clone(),
            }),
            Type::WithInjection(inner) => Self::with_injection(TypeWithInjection {
                tpe: Self::rename_type(inner.data.tpe, new_name)?,
                injection: inner.data.injection.clone(),
            }),
            Type::Boolean(inner) => Ok(inner.rename(new_name)?.into()),
            Type::Integer(inner) => Ok(inner.rename(new_name)?.into()),
            Type::Float(inner) => Ok(inner.rename(new_name)?.into()),
            Type::String(inner) => Ok(inner.rename(new_name)?.into()),
            Type::File(inner) => Ok(inner.rename(new_name)?.into()),
            Type::Optional(inner) => Ok(inner.rename(new_name)?.into()),
            Type::List(inner) => Ok(inner.rename(new_name)?.into()),
            Type::Union(inner) => Ok(inner.rename(new_name)?.into()),
            Type::Either(inner) => Ok(inner.rename(new_name)?.into()),
            Type::Struct(inner) => Ok(inner.rename(new_name)?.into()),
            Type::Func(inner) => Ok(inner.rename(new_name)?.into()),
        }
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
    use crate::wit::core::Cors;
    use crate::wit::core::Guest;
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
        Lib::finalize_typegraph()?;
        Ok(())
    }

    #[test]
    fn test_no_active_context() -> Result<()> {
        Store::reset();
        assert_eq!(
            Lib::expose(vec![], None),
            Err(errors::expected_typegraph_context())
        );

        assert_eq!(
            Lib::finalize_typegraph(),
            Err(errors::expected_typegraph_context())
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
        let typegraph = Lib::finalize_typegraph()?;
        insta::assert_snapshot!(typegraph);
        Ok(())
    }
}
