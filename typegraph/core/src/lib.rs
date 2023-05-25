// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::core::{IntegerConstraints, StructConstraints};

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
        print(&format!("data: {:?}", data));
        let tpe = T::Struct(data);
        tg().add(tpe)
    }

    fn type_as_struct(id: u32) -> Option<StructConstraints> {
        print(&format!("data: {:?}", tg().get(id)));
        match tg().get(id) {
            T::Struct(typ) => Some(typ.clone()),
            _ => None,
        }
    }

    fn get_type_repr(id: u32) -> Option<String> {
        let tg = tg();
        match tg.get(id) {
            T::Integer(v) => {
                let type_data = [
                    v.min.map(|min| format!("{min}")),
                    v.max.map(|max| format!("{max}")),
                ]
                .into_iter()
                .flatten()
                .collect::<Vec<_>>()
                .join(", ");
                Some(format!("integer#{id}({type_data})"))
            }
            _ => panic!("not an integer"),
        }
    }
}
