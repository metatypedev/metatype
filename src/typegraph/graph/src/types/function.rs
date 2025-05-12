// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::interlude::*;
use super::ObjectType;
use crate::injection::InjectionNode;
use crate::interlude::*;
use crate::runtimes::{Materializer, Runtime};
use tg_schema::parameter_transform::FunctionParameterTransform;

#[derive(Debug)]
pub struct FunctionType {
    pub base: TypeBase,
    pub(crate) input: OnceLock<Arc<ObjectType>>,
    pub(crate) output: OnceLock<Type>,
    pub parameter_transform: Option<FunctionParameterTransform>,
    pub injection: Option<Arc<InjectionNode>>,
    pub runtime_config: serde_json::Value, // TODO should not this be removed?
    pub materializer: Materializer,
    pub rate_weight: Option<u32>,
    pub rate_calls: bool,
}

impl FunctionType {
    pub fn input(&self) -> &Arc<ObjectType> {
        self.input.get().expect("function input uninitialized")
    }
    pub fn non_empty_input(&self) -> Option<&Arc<ObjectType>> {
        let input = self.input();
        if input.properties().is_empty() {
            None
        } else {
            Some(input)
        }
    }

    pub fn output(&self) -> &Type {
        self.output.get().expect("function output uninitialized")
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

pub struct LinkFunction<K: DupKey> {
    pub ty: Arc<FunctionType>,
    pub input: TypeKeyEx<K>,
    pub output: TypeKeyEx<K>,
}

impl<K: DupKey> LinkFunction<K> {
    pub fn link<G: DuplicationEngine<Key = K>>(self, map: &ConversionMap<G>) -> Result<()> {
        let input = map.get_ex(self.input).ok_or_else(|| {
            eyre!(
                "cannot find input type for function; key={:?}",
                self.ty.key()
            )
        })?;
        match &input {
            Type::Object(obj) => {
                self.ty.input.set(obj.clone()).map_err(|_| {
                    eyre!(
                        "OnceLock: cannot set function input more than once; key={:?}",
                        self.ty.key()
                    )
                })?;
            }
            _ => {
                return Err(eyre!(
                    "function input must be an object type; key={:?}",
                    self.ty.key()
                ));
            }
        }

        let output = map.get_ex(self.output).ok_or_else(|| {
            eyre!(
                "cannot find output type for function; key={:?}",
                self.ty.key()
            )
        })?;
        self.ty.output.set(output.clone()).map_err(|_| {
            eyre!(
                "OnceLock: cannot set function output more than once; key={:?}",
                self.ty.key()
            )
        })
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
