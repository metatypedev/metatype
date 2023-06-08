// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod conversion;
mod errors;
mod global_store;
mod typegraph;
mod types;
mod validation;

use crate::core::{TypeBase, TypegraphInitParams};
use std::collections::HashSet;

use crate::core::{TypeFunc, TypeId, TypeInteger, TypeProxy, TypeStruct};
use errors::Result;
use global_store::store;
use types::{Func, Integer, Proxy, Struct, T};
use validation::validate_name;

wit_bindgen::generate!("typegraph");

#[cfg(feature = "wasm")]
export_typegraph!(Lib);

pub struct Lib {}

impl core::Core for Lib {
    fn init_typegraph(params: TypegraphInitParams) -> Result<()> {
        typegraph::init(params)
    }

    fn finalize_typegraph() -> Result<String> {
        typegraph::finalize()
    }

    fn proxyb(data: TypeProxy) -> Result<TypeId> {
        let mut s = store();
        if let Some(type_id) = s.type_by_names.get(&data.name) {
            Ok(*type_id)
        } else {
            let tpe = T::Proxy(Proxy(data));
            Ok(s.add_type(tpe))
        }
    }

    fn integerb(data: TypeInteger, base: TypeBase) -> Result<TypeId> {
        if let (Some(min), Some(max)) = (data.min, data.max) {
            if min >= max {
                return Err(errors::invalid_max_value());
            }
        }
        let tpe = T::Integer(Integer(base, data));
        Ok(store().add_type(tpe))
    }

    fn type_as_integer(type_id: TypeId) -> Result<(TypeId, TypeBase, TypeInteger)> {
        let s = store();
        let type_id = s.resolve_proxy(type_id)?;
        match s.get_type(type_id)? {
            T::Integer(typ) => Ok((type_id, typ.0.clone(), typ.1)),
            _ => Err(errors::expected_type("integer", type_id)),
        }
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

        let tpe = T::Struct(Struct(base, data));
        Ok(store().add_type(tpe))
    }

    fn type_as_struct(type_id: TypeId) -> Result<(TypeId, TypeBase, TypeStruct)> {
        let s = store();
        let type_id = s.resolve_proxy(type_id)?;
        match s.get_type(type_id)? {
            T::Struct(typ) => Ok((type_id, typ.0.clone(), typ.1.clone())),
            _ => Err(errors::expected_type("struct", type_id)),
        }
    }

    fn funcb(data: TypeFunc) -> Result<TypeId> {
        let mut s = store();
        let inp_id = s.resolve_proxy(data.inp)?;
        let inp_type = s.get_type(inp_id)?;
        if !matches!(inp_type, T::Struct(_)) {
            return Err(errors::invalid_input_type(&s.get_type_repr(inp_id)?));
        }
        let tpe = T::Func(Func(TypeBase::default(), data));
        Ok(s.add_type(tpe))
    }

    fn get_type_repr(type_id: TypeId) -> Result<String> {
        store().get_type_repr(type_id)
    }

    fn expose(fns: Vec<(String, TypeId)>, namespace: Vec<String>) -> Result<(), String> {
        typegraph::expose(fns, namespace)
    }
}

#[cfg(test)]
mod tests {
    use super::core::Core;
    use super::*;

    impl Default for TypeInteger {
        fn default() -> Self {
            Self {
                min: None,
                max: None,
            }
        }
    }

    impl TypeInteger {
        fn min(mut self, min: i32) -> Self {
            self.min = Some(min);
            self
        }
        fn max(mut self, max: i32) -> Self {
            self.max = Some(max);
            self
        }
    }

    impl Default for TypeStruct {
        fn default() -> Self {
            Self { props: vec![] }
        }
    }

    impl TypeStruct {
        fn prop(mut self, key: impl Into<String>, type_id: TypeId) -> Self {
            self.props.push((key.into(), type_id));
            self
        }
    }

    impl TypeFunc {
        fn new(inp: TypeId, out: TypeId) -> Self {
            Self { inp, out }
        }
    }

    #[test]
    fn test_integer_invalid_max() {
        let res = Lib::integerb(TypeInteger::default().min(12).max(10), TypeBase::default());
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
        let res = Lib::funcb(TypeFunc::new(
            inp,
            Lib::integerb(TypeInteger::default(), TypeBase::default())?,
        ));
        assert_eq!(
            res,
            Err(errors::invalid_input_type(&store().get_type_repr(inp)?))
        );
        Ok(())
    }

    #[test]
    fn test_nested_typegraph_context() -> Result<(), String> {
        store().reset();
        Lib::init_typegraph(TypegraphInitParams {
            name: "test-1".to_string(),
        })?;
        assert_eq!(
            Lib::init_typegraph(TypegraphInitParams {
                name: "test-2".to_string(),
            }),
            Err(errors::nested_typegraph_context("test-1"))
        );
        Lib::finalize_typegraph()?;
        Ok(())
    }

    #[test]
    fn test_no_active_context() -> Result<(), String> {
        store().reset();
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
        store().reset();
        Lib::init_typegraph(TypegraphInitParams {
            name: "test".to_string(),
        })?;
        let tpe = Lib::integerb(TypeInteger::default(), TypeBase::default())?;
        let res = Lib::expose(vec![("one".to_string(), tpe.into())], vec![]);

        assert_eq!(
            res,
            Err(errors::invalid_export_type(
                "one",
                &store().get_type_repr(tpe)?
            ))
        );

        Ok(())
    }

    #[test]
    fn test_expose_invalid_name() -> Result<(), String> {
        store().reset();
        Lib::init_typegraph(TypegraphInitParams {
            name: "test".to_string(),
        })?;

        let res = Lib::expose(
            vec![(
                "".to_string(),
                Lib::funcb(TypeFunc::new(
                    Lib::structb(TypeStruct::default(), TypeBase::default())?,
                    Lib::integerb(TypeInteger::default(), TypeBase::default())?,
                ))?
                .into(),
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
                ))?
                .into(),
            )],
            vec![],
        );
        assert_eq!(res, Err(errors::invalid_export_name("hello_world!")));

        Ok(())
    }

    #[test]
    fn test_expose_duplicate() -> Result<(), String> {
        store().reset();
        Lib::init_typegraph(TypegraphInitParams {
            name: "test".to_string(),
        })?;

        let res = Lib::expose(
            vec![
                (
                    "one".to_string(),
                    Lib::funcb(TypeFunc::new(
                        Lib::structb(TypeStruct::default(), TypeBase::default())?,
                        Lib::integerb(TypeInteger::default(), TypeBase::default())?,
                    ))?
                    .into(),
                ),
                (
                    "one".to_string(),
                    Lib::funcb(TypeFunc::new(
                        Lib::structb(TypeStruct::default(), TypeBase::default())?,
                        Lib::integerb(TypeInteger::default(), TypeBase::default())?,
                    ))?
                    .into(),
                ),
            ],
            vec![],
        );
        assert_eq!(res, Err(errors::duplicate_export_name("one")));

        Ok(())
    }

    #[test]
    fn test_successful_serialization() -> Result<(), String> {
        store().reset();
        let a = Lib::integerb(TypeInteger::default(), TypeBase::default())?;
        let b = Lib::integerb(TypeInteger::default().min(12).max(44), TypeBase::default())?;
        let s = Lib::structb(
            TypeStruct::default().prop("one", a).prop("two", b),
            TypeBase::default(),
        )?;
        Lib::init_typegraph(TypegraphInitParams {
            name: "test".to_string(),
        })?;
        Lib::expose(
            vec![("one".to_string(), Lib::funcb(TypeFunc::new(s, b))?.into())],
            vec![],
        )?;
        let typegraph = Lib::finalize_typegraph()?;
        insta::assert_snapshot!(typegraph);
        Ok(())
    }
}
