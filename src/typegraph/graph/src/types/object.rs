// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{Edge, EdgeKind, Type, TypeBase, TypeNode, WeakType};
use crate::{policies::PolicyRef, Lazy, Lrc};
use std::collections::HashMap;

#[derive(Debug)]
pub struct ObjectProperty {
    pub type_: Type,
    pub policies: Vec<PolicyRef>,
    pub injection: Option<()>, // TODO
    pub outjection: Option<()>,
    pub required: bool,
}

#[derive(Debug)]
pub struct ObjectType {
    pub base: TypeBase,
    pub properties: Lazy<HashMap<Lrc<str>, ObjectProperty>>,
}

impl ObjectType {
    pub fn properties(&self) -> &HashMap<Lrc<str>, ObjectProperty> {
        self.properties.get().expect("uninitialized")
    }
}

impl TypeNode for ObjectType {
    fn base(&self) -> &TypeBase {
        &self.base
    }

    fn children(&self) -> Vec<Type> {
        self.properties()
            .values()
            .map(|p| p.type_.clone())
            .collect()
    }

    fn edges(self: &Lrc<Self>) -> Vec<Edge> {
        self.properties()
            .iter()
            .map(|(name, prop)| Edge {
                from: WeakType::Object(Lrc::downgrade(self)),
                to: prop.type_.clone(),
                kind: EdgeKind::ObjectProperty(name.clone()),
            })
            .collect()
    }
}
