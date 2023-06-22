// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use typegraph_core::wit::core::{
    Core, TypeBase, TypeFunc, TypeInteger, TypeStruct, TypegraphInitParams,
};
use typegraph_core::wit::runtimes::{MaterializerDenoFunc, Runtimes};
use typegraph_core::Lib as t;

fn main() -> Result<(), String> {
    let a = t::integerb(
        TypeInteger {
            min: None,
            max: None,
        },
        TypeBase::default(),
    )
    .unwrap();
    println!("{}", t::get_type_repr(a)?);
    let b = t::integerb(
        TypeInteger {
            min: Some(12),
            max: None,
        },
        TypeBase::default(),
    )
    .unwrap();
    println!("{}", t::get_type_repr(b)?);

    let s1 = t::structb(
        TypeStruct {
            props: vec![("a".to_string(), a), ("b".to_string(), b)],
        },
        TypeBase::default(),
    )
    .unwrap();
    println!("{}", t::get_type_repr(s1)?);

    let f = t::funcb(TypeFunc {
        inp: s1,
        out: a,
        mat: t::register_deno_func(
            MaterializerDenoFunc {
                code: "() => 12".to_string(),
                secrets: vec![],
            },
            typegraph_core::wit::runtimes::Effect::None,
        )
        .unwrap(),
    })
    .unwrap();
    println!("{}", t::get_type_repr(f)?);

    t::init_typegraph(TypegraphInitParams {
        name: "test".to_string(),
    })
    .unwrap();
    t::expose(vec![("one".to_string(), f)], vec![]).unwrap();
    println!("{}", t::finalize_typegraph().unwrap());

    Ok(())
}
