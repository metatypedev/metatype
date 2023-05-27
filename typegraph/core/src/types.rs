// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use enum_dispatch::enum_dispatch;
use std::fmt::Display;

use crate::{
    core::{TypeBase, TypeFunc, TypeId, TypeInteger, TypeRef, TypeStruct},
    errors::Result,
    global_store::{store, Store},
};

impl Display for TypeRef {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TypeRef::Id(id) => write!(f, "#{id}"),
            TypeRef::Name(name) => write!(f, "#{name}"),
        }
    }
}

impl TypeRef {
    pub fn resolve(&self, s: &Store) -> Result<TypeId> {
        s.resolve_ref(self.clone())
    }

    pub fn repr(&self) -> Result<String> {
        let s = store();
        s.get_type_repr(self.resolve(&s)?)
    }
}

impl From<TypeId> for TypeRef {
    fn from(val: TypeId) -> Self {
        TypeRef::Id(val)
    }
}

#[allow(clippy::derivable_impls)]
impl Default for TypeBase {
    fn default() -> Self {
        Self { name: None }
    }
}

#[derive(Debug)]
pub struct Struct(pub TypeBase, pub TypeStruct);

#[derive(Debug)]
pub struct Integer(pub TypeBase, pub TypeInteger);

#[derive(Debug)]
pub struct Func(pub TypeBase, pub TypeFunc);

#[derive(Debug)]
#[enum_dispatch(TypeFun)]
pub enum T {
    Struct(Struct),
    Integer(Integer),
    Func(Func),
}

#[enum_dispatch]
pub trait TypeFun {
    fn get_repr(&self, id: TypeId) -> String;
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
}

impl TypeFun for Func {
    fn get_repr(&self, id: TypeId) -> String {
        let c = &self.1;
        format!("func(#{id}, #{} => #{})", c.inp, c.out)
    }
}
