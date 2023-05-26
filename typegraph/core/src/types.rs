// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use enum_dispatch::enum_dispatch;
use serde::Serialize;
use std::collections::HashMap;
use std::fmt::Display;

use crate::core::{FuncConstraints, IntegerConstraints, StructConstraints, Tpe};
use crate::typegraph::tg;

impl Display for Tpe {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&tg().get_type_repr(self.id))
    }
}

#[derive(Debug)]
#[enum_dispatch(TypeFun)]
pub enum T {
    Struct(StructConstraints),
    Integer(IntegerConstraints),
    Func(FuncConstraints),
}

impl T {
    pub fn get_repr(&self, id: u32) -> String {
        match self {
            T::Integer(v) => {
                let data = [
                    Some(format!("#{id}")),
                    v.min.map(|min| format!("min={min}")),
                    v.max.map(|max| format!("max={max}")),
                ]
                .into_iter()
                .flatten()
                .collect::<Vec<_>>()
                .join(", ");
                format!("integer({data})")
            }
            T::Struct(v) => {
                let props = v
                    .props
                    .iter()
                    .map(|(name, tpe_id)| format!("[{name}] => #{tpe_id}"))
                    .collect::<Vec<_>>()
                    .join(", ");
                format!("struct(#{id}, {props})")
            }
            T::Func(t) => format!("func(#{id}, #{} => #{})", t.inp, t.out),
        }
    }
}

#[derive(Clone, Debug, Default, Serialize)]
pub struct Struct {
    pub props: HashMap<String, u32>,
}

impl From<StructConstraints> for Struct {
    fn from(value: StructConstraints) -> Self {
        Self {
            props: value.props.into_iter().collect(),
        }
    }
}

#[derive(Debug, Default, Serialize, Clone)]
pub struct Integer {
    pub min: Option<i64>,
    pub max: Option<i64>,
}

impl From<IntegerConstraints> for Integer {
    fn from(value: IntegerConstraints) -> Self {
        Self {
            min: value.min,
            max: value.max,
        }
    }
}
