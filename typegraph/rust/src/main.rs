// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use typegraph_core::core::{Core, TypeFunc, TypeInteger, TypeRef, TypeStruct, TypegraphInitParams};
use typegraph_core::Lib as t;

fn main() -> Result<(), String> {
    let a = t::integerb(TypeInteger {
        min: None,
        max: None,
    })
    .unwrap();
    println!("{}", TypeRef::Id(a).repr()?);
    let b = t::integerb(TypeInteger {
        min: Some(12),
        max: None,
    })
    .unwrap();
    println!("{}", TypeRef::Id(b).repr()?);

    let s1 = t::structb(TypeStruct {
        props: vec![("a".to_string(), a.into()), ("b".to_string(), b.into())],
    })
    .unwrap();
    println!("{}", TypeRef::Id(s1).repr()?);

    let f = t::funcb(TypeFunc {
        inp: s1.into(),
        out: a.into(),
    })
    .unwrap();
    println!("{}", TypeRef::Id(f).repr()?);

    t::init_typegraph(TypegraphInitParams {
        name: "test".to_string(),
    })
    .unwrap();
    t::expose(vec![("one".to_string(), f.into())], vec![]).unwrap();
    println!("{}", t::finalize_typegraph().unwrap());

    Ok(())
}
