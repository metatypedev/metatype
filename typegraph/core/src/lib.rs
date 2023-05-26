// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashSet;

use crate::core::{FuncConstraints, IntegerConstraints, StructConstraints};
use regex::Regex;

mod serialize;
mod typegraph;
mod types;

use typegraph::tg;
use types::T;

wit_bindgen::generate!("typegraph");

#[cfg(feature = "wasm")]
export_typegraph!(Lib);

pub struct Lib {}

impl core::Core for Lib {
    fn integerb(data: IntegerConstraints) -> core::Tpe {
        // print(&serde_json::to_string(&data).unwrap());
        let tpe = T::Integer(data);
        tg().add(tpe)
    }

    fn type_as_integer(id: u32) -> Option<IntegerConstraints> {
        match tg().get(id) {
            T::Integer(typ) => Some(*typ),
            _ => None,
        }
    }

    fn structb(data: StructConstraints) -> Result<core::Tpe, String> {
        let mut prop_names = HashSet::new();
        let re = Regex::new(r"^[_a-zA-Z]+$")
            .map_err(|err| format!("Could not compile Regex: {err:?}"))?;
        for (name, _) in data.props.iter() {
            if !re.is_match(name) {
                return Err(format!("'{name}' is not a valid property key: keys can only contain letters and underscore"));
            }
            if prop_names.contains(name) {
                return Err(format!("Duplicate key '{name}' in struct props"));
            }
            prop_names.insert(name.clone());
        }

        let tpe = T::Struct(data);
        Ok(tg().add(tpe))
    }

    fn type_as_struct(id: u32) -> Option<StructConstraints> {
        // print(&format!("data: {:?}", tg().get(id)));
        match tg().get(id) {
            T::Struct(typ) => Some(typ.clone()),
            _ => None,
        }
    }

    fn funcb(data: FuncConstraints) -> Result<core::Tpe, String> {
        let mut tg = tg();
        let inp_type = tg.get(data.inp);
        if !matches!(inp_type, T::Struct(_)) {
            return Err(format!(
                "Expected a Struct as input type; got {}",
                tg.get_type_repr(data.inp)
            ));
        }
        let tpe = T::Func(data);
        Ok(tg.add(tpe))
    }

    fn get_type_repr(id: u32) -> String {
        tg().get_type_repr(id)
    }

    fn expose(fns: Vec<(String, u32)>, namespace: Vec<String>) -> Result<(), String> {
        tg().expose(fns, namespace)
    }

    fn serialize() -> Result<String, String> {
        tg().serialize()
    }
}
