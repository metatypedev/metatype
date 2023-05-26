// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use typegraph_core::core::{Core, FuncConstraints, IntegerConstraints, StructConstraints};
use typegraph_core::Lib as t;

fn main() {
    let a = t::integerb(IntegerConstraints {
        min: None,
        max: None,
    })
    .unwrap();
    println!("{a}");
    let b = t::integerb(IntegerConstraints {
        min: Some(12),
        max: None,
    })
    .unwrap();
    println!("{b}");

    let s1 = t::structb(StructConstraints {
        props: vec![("a".to_string(), a.id), ("b".to_string(), b.id)],
    })
    .unwrap();
    println!("{s1}");

    let f = t::funcb(FuncConstraints {
        inp: s1.id,
        out: a.id,
    })
    .unwrap();
    println!("{f}");

    t::init_typegraph("test".to_string()).unwrap();
    t::expose(vec![("one".to_string(), f.id)], vec![]).unwrap();
    println!("{}", t::finalize_typegraph().unwrap());
}
