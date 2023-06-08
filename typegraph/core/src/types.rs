// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use enum_dispatch::enum_dispatch;

use crate::core::{TypeBase, TypeFunc, TypeId, TypeInteger, TypeProxy, TypeStruct};

#[allow(clippy::derivable_impls)]
impl Default for TypeBase {
    fn default() -> Self {
        Self { name: None }
    }
}

#[derive(Debug)]
pub struct Proxy(pub TypeProxy);

#[derive(Debug)]
pub struct Struct(pub TypeBase, pub TypeStruct);

#[derive(Debug)]
pub struct Integer(pub TypeBase, pub TypeInteger);

#[derive(Debug)]
pub struct Func(pub TypeBase, pub TypeFunc);

#[derive(Debug)]
#[enum_dispatch(TypeFun)]
pub enum T {
    Proxy(Proxy),
    Struct(Struct),
    Integer(Integer),
    Func(Func),
}

#[enum_dispatch]
pub trait TypeFun {
    fn get_repr(&self, id: TypeId) -> String;
    fn get_base(&self) -> Option<&TypeBase>;
}

impl TypeFun for Proxy {
    fn get_repr(&self, id: TypeId) -> String {
        format!("proxy(#{id})")
    }

    fn get_base(&self) -> Option<&TypeBase> {
        None
    }
}

impl TypeFun for Integer {
    fn get_repr(&self, id: TypeId) -> String {
        let c = self.1;
        let data = [
            Some(format!("#{id}")),
            c.min.map(|min| format!("min={min}")),
            c.max.map(|max| format!("max={max}")),
        ]
        .into_iter()
        .flatten()
        .collect::<Vec<_>>()
        .join(", ");
        format!("integer({data})")
    }

    fn get_base(&self) -> Option<&TypeBase> {
        Some(&self.0)
    }
}

impl TypeFun for Struct {
    fn get_repr(&self, id: TypeId) -> String {
        let c = &self.1;
        let props = c
            .props
            .iter()
            .map(|(name, tpe_id)| format!("[{name}] => #{tpe_id}"))
            .collect::<Vec<_>>()
            .join(", ");
        format!("struct(#{id}, {props})")
    }

    fn get_base(&self) -> Option<&TypeBase> {
        Some(&self.0)
    }
}

impl TypeFun for Func {
    fn get_repr(&self, id: TypeId) -> String {
        let c = &self.1;
        format!("func(#{id}, #{} => #{})", c.inp, c.out)
    }

    fn get_base(&self) -> Option<&TypeBase> {
        Some(&self.0)
    }
}
