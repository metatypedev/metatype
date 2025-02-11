// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{Edge, EdgeKind, Type, TypeBase, TypeNode, WeakType};
use crate::{Lazy, Lrc};

#[derive(Debug)]
pub struct UnionType {
    pub base: TypeBase,
    pub variants: Lazy<Vec<Type>>,
}

impl UnionType {
    pub fn variants(&self) -> &Vec<Type> {
        self.variants.get().expect("uninitialized")
    }
}

impl TypeNode for UnionType {
    fn base(&self) -> &TypeBase {
        &self.base
    }

    fn children(&self) -> Vec<Type> {
        self.variants().clone()
    }

    fn edges(self: &Lrc<Self>) -> Vec<Edge> {
        self.variants()
            .iter()
            .enumerate()
            .map(|(v, t)| Edge {
                from: WeakType::Union(Lrc::downgrade(self)),
                to: t.clone(),
                kind: EdgeKind::UnionVariant(v),
            })
            .collect()
    }
}

#[derive(Debug)]
pub struct EitherType {
    pub base: TypeBase,
    pub variants: Lazy<Vec<Type>>,
}

impl EitherType {
    pub fn variants(&self) -> &Vec<Type> {
        self.variants.get().expect("uninitialized")
    }
}

impl TypeNode for EitherType {
    fn base(&self) -> &TypeBase {
        &self.base
    }

    fn children(&self) -> Vec<Type> {
        self.variants().clone()
    }

    fn edges(self: &Lrc<Self>) -> Vec<Edge> {
        self.variants()
            .iter()
            .enumerate()
            .map(|(v, t)| Edge {
                from: WeakType::Either(Lrc::downgrade(self)),
                to: t.clone(),
                kind: EdgeKind::EitherVariant(v),
            })
            .collect()
    }
}
