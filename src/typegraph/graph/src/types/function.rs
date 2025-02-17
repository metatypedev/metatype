// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{Edge, EdgeKind, ObjectType, Type, TypeBase, TypeNode, WeakType};
use crate::{
    runtimes::{Materializer, Runtime},
    Lazy, Arc,
};
use tg_schema::parameter_transform::FunctionParameterTransform;

#[derive(Debug)]
pub struct FunctionType {
    pub base: TypeBase,
    pub(crate) input: Lazy<Arc<ObjectType>>,
    pub(crate) output: Lazy<Type>,
    pub parameter_transform: Option<FunctionParameterTransform>,
    pub runtime_config: serde_json::Value, // TODO should not this be removed?
    pub materializer: Materializer,
    pub rate_weight: Option<u32>,
    pub rate_calls: bool,
}

impl FunctionType {
    pub fn input(&self) -> &Arc<ObjectType> {
        self.input.get().expect("uninitialized")
    }

    pub fn output(&self) -> &Type {
        self.output.get().expect("uninitialized")
    }

    pub fn effect(&self) -> tg_schema::EffectType {
        self.materializer
            .effect
            .effect
            .unwrap_or(tg_schema::EffectType::Read)
    }

    pub fn runtime(&self) -> &Runtime {
        &self.materializer.runtime
    }
}

impl TypeNode for Arc<FunctionType> {
    fn base(&self) -> &TypeBase {
        &self.base
    }

    fn tag(&self) -> &'static str {
        "function"
    }

    fn children(&self) -> Vec<Type> {
        vec![Type::Object(self.input().clone()), self.output().clone()]
    }

    fn edges(&self) -> Vec<Edge> {
        vec![
            Edge {
                from: WeakType::Function(Arc::downgrade(self)),
                to: Type::Object(self.input().clone()),
                kind: EdgeKind::FunctionInput,
            },
            Edge {
                from: WeakType::Function(Arc::downgrade(self)),
                to: self.output().clone(),
                kind: EdgeKind::FunctionOutput,
            },
        ]
    }
}
