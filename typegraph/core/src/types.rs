// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use enum_dispatch::enum_dispatch;
use serde::Serialize;
use std::collections::HashMap;

use crate::core::{IntegerConstraints, StructConstraints};

#[derive(Debug)]
#[enum_dispatch(TypeFun)]
pub enum T {
    Struct(StructConstraints),
    Integer(IntegerConstraints),
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
    pub min: Option<i32>,
    pub max: Option<i32>,
}

impl From<IntegerConstraints> for Integer {
    fn from(value: IntegerConstraints) -> Self {
        Self {
            min: value.min,
            max: value.max,
        }
    }
}
