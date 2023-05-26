// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashSet;

use crate::core::{FuncConstraints, IntegerConstraints, StructConstraints};

mod errors;
mod serialize;
mod typegraph;
mod types;
mod validation;

use typegraph::tg;
use types::T;
use validation::validate_name;

wit_bindgen::generate!("typegraph");

#[cfg(feature = "wasm")]
export_typegraph!(Lib);

pub struct Lib {}

impl core::Core for Lib {
    fn init_typegraph(name: String) -> Result<(), String> {
        tg().init_typegraph(name)
    }

    fn finalize_typegraph() -> Result<String, String> {
        tg().finalize_typegraph()
    }

    fn integerb(data: IntegerConstraints) -> Result<core::Tpe, String> {
        if let (Some(min), Some(max)) = (data.min, data.max) {
            if min >= max {
                return Err(errors::invalid_max_value());
            }
        }
        let tpe = T::Integer(data);
        Ok(tg().add_type(tpe))
    }

    fn type_as_integer(id: u32) -> Option<IntegerConstraints> {
        match tg().get_type(id) {
            T::Integer(typ) => Some(*typ),
            _ => None,
        }
    }

    fn structb(data: StructConstraints) -> Result<core::Tpe, String> {
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

        let tpe = T::Struct(data);
        Ok(tg().add_type(tpe))
    }

    fn type_as_struct(id: u32) -> Option<StructConstraints> {
        // print(&format!("data: {:?}", tg().get(id)));
        match tg().get_type(id) {
            T::Struct(typ) => Some(typ.clone()),
            _ => None,
        }
    }

    fn funcb(data: FuncConstraints) -> Result<core::Tpe, String> {
        let mut tg = tg();
        let inp_type = tg.get_type(data.inp);
        if !matches!(inp_type, T::Struct(_)) {
            return Err(errors::invalid_input_type(&tg.get_type_repr(data.inp)));
        }
        let tpe = T::Func(data);
        Ok(tg.add_type(tpe))
    }

    fn get_type_repr(id: u32) -> String {
        tg().get_type_repr(id)
    }

    fn expose(fns: Vec<(String, u32)>, namespace: Vec<String>) -> Result<(), String> {
        tg().expose(fns, namespace)
    }
}

#[cfg(test)]
mod tests {
    use super::core::Core;
    use super::*;

    impl PartialEq for core::Tpe {
        fn eq(&self, other: &Self) -> bool {
            other.id == self.id
        }
    }

    impl Default for IntegerConstraints {
        fn default() -> Self {
            Self {
                min: None,
                max: None,
            }
        }
    }

    impl IntegerConstraints {
        fn min(mut self, min: i64) -> Self {
            self.min = Some(min);
            self
        }
        fn max(mut self, max: i64) -> Self {
            self.max = Some(max);
            self
        }
    }

    impl Default for StructConstraints {
        fn default() -> Self {
            Self { props: vec![] }
        }
    }

    impl StructConstraints {
        fn prop(mut self, key: impl Into<String>, tpe: core::Tpe) -> Self {
            self.props.push((key.into(), tpe.id));
            self
        }
    }

    impl FuncConstraints {
        fn new(inp: core::Tpe, out: core::Tpe) -> Self {
            Self {
                inp: inp.id,
                out: out.id,
            }
        }
    }

    #[test]
    fn test_integer_invalid_max() {
        let res = Lib::integerb(IntegerConstraints::default().min(12).max(10));
        assert_eq!(res, Err(errors::invalid_max_value()));
    }

    #[test]
    fn test_struct_invalid_key() -> Result<(), String> {
        let res = Lib::structb(
            StructConstraints::default().prop("", Lib::integerb(IntegerConstraints::default())?),
        );
        assert_eq!(res, Err(errors::invalid_prop_key("")));
        let res = Lib::structb(
            StructConstraints::default()
                .prop("hello world", Lib::integerb(IntegerConstraints::default())?),
        );
        assert_eq!(res, Err(errors::invalid_prop_key("hello world")));
        Ok(())
    }

    #[test]
    fn test_struct_duplicate_key() -> Result<(), String> {
        let res = Lib::structb(
            StructConstraints::default()
                .prop("one", Lib::integerb(IntegerConstraints::default())?)
                .prop("two", Lib::integerb(IntegerConstraints::default())?)
                .prop("one", Lib::integerb(IntegerConstraints::default())?),
        );
        assert_eq!(res, Err(errors::duplicate_key("one")));
        Ok(())
    }

    #[test]
    fn test_invalid_input_type() -> Result<(), String> {
        let inp = Lib::integerb(IntegerConstraints::default())?;
        let res = Lib::funcb(FuncConstraints::new(
            inp,
            Lib::integerb(IntegerConstraints::default())?,
        ));
        assert_eq!(
            res,
            Err(errors::invalid_input_type(&tg().get_type_repr(inp.id)))
        );
        Ok(())
    }

    #[test]
    fn test_nested_typegraph_context() -> Result<(), String> {
        tg().reset();
        Lib::init_typegraph("test-1".to_string())?;
        assert_eq!(
            Lib::init_typegraph("test-2".to_string()),
            Err(errors::nested_typegraph_context("test-1"))
        );
        Lib::finalize_typegraph()?;
        Ok(())
    }

    #[test]
    fn test_no_active_context() -> Result<(), String> {
        tg().reset();
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
        tg().reset();
        Lib::init_typegraph("test".to_string())?;
        let tpe = Lib::integerb(IntegerConstraints::default())?;
        let res = Lib::expose(vec![("one".to_string(), tpe.id)], vec![]);

        assert_eq!(
            res,
            Err(errors::invalid_export_type(
                "one",
                &tg().get_type_repr(tpe.id)
            ))
        );

        Ok(())
    }

    #[test]
    fn test_expose_invalid_name() -> Result<(), String> {
        tg().reset();
        Lib::init_typegraph("test".to_string())?;

        let res = Lib::expose(
            vec![(
                "".to_string(),
                Lib::funcb(FuncConstraints::new(
                    Lib::structb(StructConstraints::default())?,
                    Lib::integerb(IntegerConstraints::default())?,
                ))?
                .id,
            )],
            vec![],
        );
        assert_eq!(res, Err(errors::invalid_export_name("")));

        let res = Lib::expose(
            vec![(
                "hello_world!".to_string(),
                Lib::funcb(FuncConstraints::new(
                    Lib::structb(StructConstraints::default())?,
                    Lib::integerb(IntegerConstraints::default())?,
                ))?
                .id,
            )],
            vec![],
        );
        assert_eq!(res, Err(errors::invalid_export_name("hello_world!")));

        Ok(())
    }

    #[test]
    fn test_expose_duplicate() -> Result<(), String> {
        tg().reset();
        Lib::init_typegraph("test".to_string())?;

        let res = Lib::expose(
            vec![
                (
                    "one".to_string(),
                    Lib::funcb(FuncConstraints::new(
                        Lib::structb(StructConstraints::default())?,
                        Lib::integerb(IntegerConstraints::default())?,
                    ))?
                    .id,
                ),
                (
                    "one".to_string(),
                    Lib::funcb(FuncConstraints::new(
                        Lib::structb(StructConstraints::default())?,
                        Lib::integerb(IntegerConstraints::default())?,
                    ))?
                    .id,
                ),
            ],
            vec![],
        );
        assert_eq!(res, Err(errors::duplicate_export_name("one")));

        Ok(())
    }

    #[test]
    fn test_successful_serialization() -> Result<(), String> {
        tg().reset();
        let a = Lib::integerb(IntegerConstraints::default())?;
        let b = Lib::integerb(IntegerConstraints::default().min(12).max(44))?;
        let s = Lib::structb(StructConstraints::default().prop("one", a).prop("two", b))?;
        Lib::init_typegraph("test".to_string())?;
        Lib::expose(
            vec![(
                "one".to_string(),
                Lib::funcb(FuncConstraints::new(s, b))?.id,
            )],
            vec![],
        )?;
        let typegraph = Lib::finalize_typegraph()?;
        insta::assert_snapshot!(typegraph);
        Ok(())
    }
}
