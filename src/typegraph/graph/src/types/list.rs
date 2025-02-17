// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{Edge, EdgeKind, Type, TypeBase, TypeNode, WeakType};
use crate::{Lazy, Arc};

#[derive(Debug)]
pub struct ListType {
    pub base: TypeBase,
    pub(crate) item: Lazy<Type>,
    pub min_items: Option<u32>,
    pub max_items: Option<u32>,
    pub unique_items: bool,
}

impl ListType {
    pub fn item(&self) -> &Type {
        self.item.get().expect("uninitialized")
    }
}

impl TypeNode for Arc<ListType> {
    fn base(&self) -> &TypeBase {
        &self.base
    }

    fn tag(&self) -> &'static str {
        "list"
    }

    fn children(&self) -> Vec<Type> {
        vec![self.item().clone()]
    }

    fn edges(&self) -> Vec<Edge> {
        vec![Edge {
            from: WeakType::List(Arc::downgrade(self)),
            to: self.item().clone(),
            kind: EdgeKind::ListItem,
        }]
    }
}
