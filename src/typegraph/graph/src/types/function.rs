// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{Edge, EdgeKind, ObjectType, Type, TypeBase, TypeNode, WeakType};
use crate::{Lazy, Lrc};
use tg_schema::parameter_transform::FunctionParameterTransform;

#[derive(Debug)]
pub struct FunctionType {
    pub base: TypeBase,
    pub input: Lazy<Lrc<ObjectType>>,
    pub output: Lazy<Type>,
    pub parameter_transform: Option<FunctionParameterTransform>,
    pub runtime_config: serde_json::Value, // TODO should not this be removed?
    pub materializer: Lrc<u32>,            // TODO
    pub rate_weight: Option<u32>,
    pub rate_calls: bool,
}

impl FunctionType {
    fn input(&self) -> &Lrc<ObjectType> {
        self.input.get().expect("uninitialized")
    }

    fn output(&self) -> &Type {
        self.output.get().expect("uninitialized")
    }
}

impl TypeNode for FunctionType {
    fn base(&self) -> &TypeBase {
        &self.base
    }

    fn children(&self) -> Vec<Type> {
        vec![Type::Object(self.input().clone()), self.output().clone()]
    }

    fn edges(self: &Lrc<Self>) -> Vec<Edge> {
        vec![
            Edge {
                from: WeakType::Function(Lrc::downgrade(self)),
                to: Type::Object(self.input().clone()),
                kind: EdgeKind::FunctionInput,
            },
            Edge {
                from: WeakType::Function(Lrc::downgrade(self)),
                to: self.output().clone(),
                kind: EdgeKind::FunctionOutput,
            },
        ]
    }
}
