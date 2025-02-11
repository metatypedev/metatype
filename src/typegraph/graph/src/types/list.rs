// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{Edge, EdgeKind, Type, TypeBase, TypeNode, WeakType};
use crate::{Lazy, Lrc};

#[derive(Debug)]
pub struct ListType {
    pub base: TypeBase,
    pub item: Lazy<Type>,
    pub min_items: Option<u32>,
    pub max_items: Option<u32>,
    pub unique_items: bool,
}

impl ListType {
    pub fn item(&self) -> &Type {
        self.item.get().expect("uninitialized")
    }
}

impl TypeNode for ListType {
    fn base(&self) -> &TypeBase {
        &self.base
    }

    fn children(&self) -> Vec<Type> {
        vec![self.item().clone()]
    }

    fn edges(self: &Lrc<Self>) -> Vec<Edge> {
        vec![Edge {
            from: WeakType::List(Lrc::downgrade(self)),
            to: self.item().clone(),
            kind: EdgeKind::ListItem,
        }]
    }
}
