// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::core::{FuncConstraints, IntegerConstraints, StructConstraints};

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

    fn structb(data: StructConstraints) -> core::Tpe {
        // print(&format!("data: {:?}", data));
        let tpe = T::Struct(data);
        tg().add(tpe)
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
