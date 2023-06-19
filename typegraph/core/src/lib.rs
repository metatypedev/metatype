// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;

mod typegraph;
mod types;

use types::{Integer, Struct, TypeFun, T};

use typegraph::tg;

wit_bindgen::generate!("typegraph");

#[cfg(feature = "wasm")]
export_typegraph!(Lib);

pub struct Lib {}

pub use exports::default::typegraph::core;

impl core::Core for Lib {
    fn integerb() -> core::Tpe {
        let tpe = T::Integer(Integer {
            ..Default::default()
        });
        tg().add(tpe)
    }

    fn integermin(id: u32, n: i32) -> core::Tpe {
        let mut tg = tg();
        match tg.get(id) {
            T::Integer(parent) => {
                let tpe = T::Integer(Integer {
                    min: Some(n),
                    ..*parent
                });
                tg.add(tpe)
            }
            _ => panic!("not an integer"),
        }
    }

    fn structb(props: Vec<(String, core::Tpe)>) -> core::Tpe {
        //print(&format!("props: {:?}", props));
        let props = HashMap::from_iter(props.into_iter().map(|(k, v)| (k, v.id)));
        let tpe = T::Struct(Struct { props });
        tg().add(tpe)
    }

    fn gettpe(id: u32, field: String) -> Option<core::Tpe> {
        let tg = tg();
        tg.get(id).getattr(field)
    }
}
