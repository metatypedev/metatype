// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod conversion;
mod errors;
mod global_store;
mod runtimes;
mod typedef;
mod typegraph;
mod types;
mod validation;

#[cfg(test)]
mod test_utils;

use std::collections::HashSet;

use errors::Result;
use global_store::{with_store, with_store_mut};
use indoc::formatdoc;
use regex::Regex;
use types::{
    Array, Boolean, Either, Float, Func, Integer, Optional, Proxy, StringT, Struct, Type,
    TypeBoolean, Union, WithPolicy,
};
use validation::validate_name;
use wit::core::{
    ContextCheck, Policy, PolicyId, TypeArray, TypeBase, TypeEither, TypeFloat, TypeFunc, TypeId,
    TypeInteger, TypeOptional, TypePolicy, TypeProxy, TypeString, TypeStruct, TypeUnion,
    TypegraphInitParams,
};
use wit::runtimes::{MaterializerDenoFunc, Runtimes};

pub mod wit {
    use super::*;

    wit_bindgen::generate!("typegraph");

    export_typegraph!(Lib);

    pub use exports::metatype::typegraph::{core, runtimes};
}

#[cfg(feature = "wasm")]
pub mod host {
    wit_bindgen::generate!("host");

    pub use metatype::typegraph::abi;
}

// native stubs to make the test compilation work
#[cfg(not(feature = "wasm"))]
pub mod host {
    pub mod abi {
        pub fn log(message: &str) {
            println!("{}", message);
        }
        pub fn glob(_pattern: &str, _exts: &[String]) -> Result<Vec<String>, String> {
            Ok(vec![])
        }
        pub fn read_file(path: &str) -> Result<String, String> {
            Ok(path.to_string())
        }
        pub fn write_file(_path: &str, _data: &str) -> Result<(), String> {
            Ok(())
        }
    }
}

pub struct Lib {}

impl wit::core::Core for Lib {
    fn init_typegraph(params: TypegraphInitParams) -> Result<()> {
        typegraph::init(params)
    }

    fn finalize_typegraph() -> Result<String> {
        typegraph::finalize()
    }

    fn proxyb(data: TypeProxy) -> Result<TypeId> {
        with_store_mut(move |s| {
            let registered_type = s.type_by_names.get(&data.name);
            match (data.extras.len(), registered_type) {
                (0, Some(type_id)) => return Ok(*type_id),
                _ => Ok(s.add_type(|id| Type::Proxy(Proxy { id, data }))),
            }
        })
    }

    fn integerb(data: TypeInteger, base: TypeBase) -> Result<TypeId> {
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
        Ok(with_store_mut(move |s| {
            s.add_type(|id| Type::Integer(Integer { id, base, data }))
        }))
    }

    fn floatb(data: TypeFloat, base: TypeBase) -> Result<TypeId> {
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
        Ok(with_store_mut(move |s| {
            s.add_type(|id| Type::Float(Float { id, base, data }))
        }))
    }

    fn booleanb(base: TypeBase) -> Result<TypeId> {
        Ok(with_store_mut(move |s| {
            s.add_type(|id| {
                Type::Boolean(Boolean {
                    id,
                    base,
                    data: TypeBoolean,
                })
            })
        }))
    }

    fn stringb(data: TypeString, base: TypeBase) -> Result<TypeId> {
        if let (Some(min), Some(max)) = (data.min, data.max) {
            if min >= max {
                return Err(errors::invalid_max_value());
            }
        }
        Ok(with_store_mut(move |s| {
            s.add_type(|id| Type::String(StringT { id, base, data }))
        }))
    }

    fn arrayb(data: TypeArray, base: TypeBase) -> Result<TypeId> {
        if let (Some(min), Some(max)) = (data.min, data.max) {
            if min >= max {
                return Err(errors::invalid_max_value());
            }
        }
        with_store_mut(move |s| -> Result<_> {
            let base = match s.get_type_name(data.of)? {
                Some(name) => {
                    // TODO
                    let name = format!("{}[]", name);
                    TypeBase {
                        name: Some(name),
                        ..base
                    }
                }
                None => base,
            };
            Ok(s.add_type(|id| Type::Array(Array { id, base, data })))
        })
    }

    fn optionalb(data: TypeOptional, base: TypeBase) -> Result<TypeId> {
        Ok(with_store_mut(move |s| {
            s.add_type(|id| Type::Optional(Optional { id, base, data }))
        }))
    }

    fn unionb(data: TypeUnion, base: TypeBase) -> Result<TypeId> {
        Ok(with_store_mut(move |s| {
            s.add_type(|id| Type::Union(Union { id, base, data }))
        }))
    }

    fn eitherb(data: TypeEither, base: TypeBase) -> Result<TypeId> {
        Ok(with_store_mut(move |s| {
            s.add_type(|id| Type::Either(Either { id, base, data }))
        }))
    }

    fn structb(data: TypeStruct, base: TypeBase) -> Result<TypeId> {
        let mut prop_names = HashSet::new();
        for (name, _) in data.props.iter() {
            if !validate_name(name) {
                return Err(errors::invalid_prop_key(name));
            }
            if prop_names.contains(name) {
                return Err(errors::duplicate_key(name));
            }
            prop_names.insert(name.clone());
        }

        Ok(with_store_mut(|s| {
            s.add_type(|id| Type::Struct(Struct { id, base, data }))
        }))
    }

    fn funcb(data: TypeFunc) -> Result<TypeId> {
        with_store_mut(|s| {
            let inp_id = s.resolve_proxy(data.inp)?;
            let inp_type = s.get_type(inp_id)?;
            if !matches!(inp_type, Type::Struct(_)) {
                return Err(errors::invalid_input_type(&s.get_type_repr(inp_id)?));
            }
            let base = TypeBase::default();
            Ok(s.add_type(|id| Type::Func(Func { id, base, data })))
        })
    }

    fn with_policy(data: TypePolicy) -> Result<TypeId> {
        with_store_mut(|s| Ok(s.add_type(|id| Type::WithPolicy(WithPolicy { id, data }))))
    }

    fn register_policy(pol: Policy) -> Result<PolicyId> {
        with_store_mut(|s| s.register_policy(pol))
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
            wit::runtimes::Effect::None,
        )?;

        Lib::register_policy(Policy {
            name: name.clone(),
            materializer: mat_id,
        })
        .map(|id| (id, name))
    }

    fn get_type_repr(type_id: TypeId) -> Result<String> {
        with_store(|s| s.get_type_repr(type_id))
    }

    fn expose(fns: Vec<(String, TypeId)>, namespace: Vec<String>) -> Result<(), String> {
        typegraph::expose(fns, namespace)
    }
}

#[cfg(test)]
mod tests {
    use crate::errors;
    use crate::global_store::{with_store, with_store_mut};
    use crate::test_utils::*;

    #[test]
    fn test_integer_invalid_max() {
        let res = Lib::integerb(TypeInteger::default().min(12).max(10), TypeBase::default());
        assert_eq!(res, Err(errors::invalid_max_value()));
        let res = Lib::integerb(
            TypeInteger::default().x_min(12).x_max(10),
            TypeBase::default(),
        );
        assert_eq!(res, Err(errors::invalid_max_value()));
    }

    #[test]
    fn test_number_invalid_max() {
        let res = Lib::floatb(
            TypeFloat::default().min(12.34).max(12.3399),
            TypeBase::default(),
        );
        assert_eq!(res, Err(errors::invalid_max_value()));
        let res = Lib::floatb(
            TypeFloat::default().x_min(12.6).x_max(12.6),
            TypeBase::default(),
        );
        assert_eq!(res, Err(errors::invalid_max_value()));
    }

    #[test]
    fn test_struct_invalid_key() -> Result<(), String> {
        let res = Lib::structb(
            TypeStruct::default().prop(
                "",
                Lib::integerb(TypeInteger::default(), TypeBase::default())?,
            ),
            TypeBase::default(),
        );
        assert_eq!(res, Err(errors::invalid_prop_key("")));
        let res = Lib::structb(
            TypeStruct::default().prop(
                "hello world",
                Lib::integerb(TypeInteger::default(), TypeBase::default())?,
            ),
            TypeBase::default(),
        );
        assert_eq!(res, Err(errors::invalid_prop_key("hello world")));
        Ok(())
    }

    #[test]
    fn test_struct_duplicate_key() -> Result<(), String> {
        let res = Lib::structb(
            TypeStruct::default()
                .prop(
                    "one",
                    Lib::integerb(TypeInteger::default(), TypeBase::default())?,
                )
                .prop(
                    "two",
                    Lib::integerb(TypeInteger::default(), TypeBase::default())?,
                )
                .prop(
                    "one",
                    Lib::integerb(TypeInteger::default(), TypeBase::default())?,
                ),
            TypeBase::default(),
        );
        assert_eq!(res, Err(errors::duplicate_key("one")));
        Ok(())
    }

    #[test]
    fn test_invalid_input_type() -> Result<(), String> {
        let inp = Lib::integerb(TypeInteger::default(), TypeBase::default())?;
        let mat =
            Lib::register_deno_func(MaterializerDenoFunc::with_code("() => 12"), Effect::None)?;
        let res = Lib::funcb(TypeFunc::new(
            inp,
            Lib::integerb(TypeInteger::default(), TypeBase::default())?,
            mat,
        ));
        assert_eq!(
            res,
            Err(errors::invalid_input_type(&with_store(
                |s| s.get_type_repr(inp)
            )?)),
        );
        Ok(())
    }

    #[test]
    fn test_nested_typegraph_context() -> Result<(), String> {
        with_store_mut(|s| s.reset());
        Lib::init_typegraph(TypegraphInitParams {
            name: "test-1".to_string(),
            dynamic: None,
            folder: None,
            path: ".".to_string(),
        })?;
        assert_eq!(
            Lib::init_typegraph(TypegraphInitParams {
                name: "test-2".to_string(),
                dynamic: None,
                folder: None,
                path: ".".to_string(),
            }),
            Err(errors::nested_typegraph_context("test-1"))
        );
        Lib::finalize_typegraph()?;
        Ok(())
    }

    #[test]
    fn test_no_active_context() -> Result<(), String> {
        with_store_mut(|s| s.reset());
        assert_eq!(
            Lib::expose(vec![], vec![]),
            Err(errors::expected_typegraph_context())
        );

        assert_eq!(
            Lib::finalize_typegraph(),
            Err(errors::expected_typegraph_context())
        );

        Ok(())
    }

    #[test]
    fn test_expose_invalid_type() -> Result<(), String> {
        with_store_mut(|s| s.reset());
        Lib::init_typegraph(TypegraphInitParams {
            name: "test".to_string(),
            dynamic: None,
            folder: None,
            path: ".".to_string(),
        })
        .unwrap();
        let tpe = Lib::integerb(TypeInteger::default(), TypeBase::default())?;
        let res = Lib::expose(vec![("one".to_string(), tpe)], vec![]);

        assert_eq!(
            res,
            Err(errors::invalid_export_type(
                "one",
                &with_store(|s| s.get_type_repr(tpe))?
            ))
        );

        Ok(())
    }

    #[test]
    fn test_expose_invalid_name() -> Result<(), String> {
        // with_store_mut(|s| s.reset());
        Lib::init_typegraph(TypegraphInitParams {
            name: "test".to_string(),
            dynamic: None,
            folder: None,
            path: ".".to_string(),
        })?;

        let mat = Lib::register_deno_func(
            MaterializerDenoFunc::with_code("() => 12"),
            Effect::default(),
        )?;

        let res = Lib::expose(
            vec![(
                "".to_string(),
                Lib::funcb(TypeFunc::new(
                    Lib::structb(TypeStruct::default(), TypeBase::default())?,
                    Lib::integerb(TypeInteger::default(), TypeBase::default())?,
                    mat,
                ))?,
            )],
            vec![],
        );
        assert_eq!(res, Err(errors::invalid_export_name("")));

        let res = Lib::expose(
            vec![(
                "hello_world!".to_string(),
                Lib::funcb(TypeFunc::new(
                    Lib::structb(TypeStruct::default(), TypeBase::default())?,
                    Lib::integerb(TypeInteger::default(), TypeBase::default())?,
                    mat,
                ))?,
            )],
            vec![],
        );
        assert_eq!(res, Err(errors::invalid_export_name("hello_world!")));

        Ok(())
    }

    #[test]
    fn test_expose_duplicate() -> Result<(), String> {
        // with_store_mut(|s| s.reset());
        Lib::init_typegraph(TypegraphInitParams {
            name: "test".to_string(),
            dynamic: None,
            folder: None,
            path: ".".to_string(),
        })?;

        let mat =
            Lib::register_deno_func(MaterializerDenoFunc::with_code("() => 12"), Effect::None)?;

        let res = Lib::expose(
            vec![
                (
                    "one".to_string(),
                    Lib::funcb(TypeFunc::new(
                        Lib::structb(TypeStruct::default(), TypeBase::default())?,
                        Lib::integerb(TypeInteger::default(), TypeBase::default())?,
                        mat,
                    ))?,
                ),
                (
                    "one".to_string(),
                    Lib::funcb(TypeFunc::new(
                        Lib::structb(TypeStruct::default(), TypeBase::default())?,
                        Lib::integerb(TypeInteger::default(), TypeBase::default())?,
                        mat,
                    ))?,
                ),
            ],
            vec![],
        );
        assert_eq!(res, Err(errors::duplicate_export_name("one")));

        Ok(())
    }

    #[test]
    fn test_successful_serialization() -> Result<(), String> {
        with_store_mut(|s| s.reset());
        let a = Lib::integerb(TypeInteger::default(), TypeBase::default())?;
        let b = Lib::integerb(TypeInteger::default().min(12).max(44), TypeBase::default())?;
        // -- optional(array(float))
        let num_idx = Lib::floatb(TypeFloat::default(), TypeBase::default())?;
        let array_idx = Lib::arrayb(TypeArray::of(num_idx), TypeBase::default())?;
        let c = Lib::optionalb(TypeOptional::of(array_idx), TypeBase::default())?;
        // --

        let s = Lib::structb(
            TypeStruct::default()
                .prop("one", a)
                .prop("two", b)
                .prop("three", c),
            TypeBase::default(),
        )?;
        Lib::init_typegraph(TypegraphInitParams {
            name: "test".to_string(),
            dynamic: None,
            folder: None,
            path: ".".to_string(),
        })?;
        let mat =
            Lib::register_deno_func(MaterializerDenoFunc::with_code("() => 12"), Effect::None)?;
        Lib::expose(
            vec![("one".to_string(), Lib::funcb(TypeFunc::new(s, b, mat))?)],
            vec![],
        )?;
        let typegraph = Lib::finalize_typegraph()?;
        insta::assert_snapshot!(typegraph);
        Ok(())
    }
}
