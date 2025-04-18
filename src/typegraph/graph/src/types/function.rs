// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::BTreeMap;

use super::{Edge, EdgeKind, ObjectType, Type, TypeBase, TypeNode, WeakType, Wrap as _};
use crate::conv::dedup::DuplicationKeyGenerator;
use crate::conv::interlude::*;
use crate::injection::InjectionNode;
use crate::{interlude::*, TypeNodeExt as _};
use crate::{
    runtimes::{Materializer, MaterializerNode, Runtime},
    Arc, Once,
};
use tg_schema::parameter_transform::FunctionParameterTransform;

#[derive(Debug)]
pub struct FunctionType {
    pub base: TypeBase,
    pub(crate) input: Once<Arc<ObjectType>>,
    pub(crate) output: Once<Type>,
    pub parameter_transform: Option<FunctionParameterTransform>,
    // TODO BTreeMap<Arc<str>, Arc<InjectionNode>>
    pub injections: BTreeMap<String, Arc<InjectionNode>>,
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

pub(crate) fn convert_function<G: DuplicationKeyGenerator>(
    base: TypeBase,
    data: &tg_schema::FunctionTypeData,
    materializer: Arc<MaterializerNode>,
) -> Box<dyn TypeConversionResult<G>> {
    let injections = data
        .injections
        .iter()
        .filter_map(|(k, v)| {
            InjectionNode::from_schema(
                v,
                materializer
                    .effect
                    .effect
                    .unwrap_or(tg_schema::EffectType::Read),
            )
            .map(|inj| (k.clone(), inj))
        })
        .collect();

    let ty = FunctionType {
        base,
        input: Default::default(),
        output: Default::default(),
        parameter_transform: data.parameter_transform.clone(),
        runtime_config: data.runtime_config.clone(),
        materializer,
        rate_weight: data.rate_weight,
        rate_calls: data.rate_calls,
        injections,
    }
    .into();

    Box::new(FunctionTypeConversionResult {
        ty,
        input_idx: data.input,
        output_idx: data.output,
    })
}

struct FunctionTypeConversionResult {
    ty: Arc<FunctionType>,
    input_idx: u32,
    output_idx: u32,
}

impl<G: DuplicationKeyGenerator> TypeConversionResult<G> for FunctionTypeConversionResult {
    fn get_type(&self) -> Type {
        self.ty.clone().wrap()
    }

    fn finalize(&mut self, conv: &mut Conversion<G>) -> Result<()> {
        let weak = self.ty.clone().wrap().downgrade();

        let mut input_res = conv.convert_type(
            weak.clone(),
            self.input_idx,
            RelativePath::input(Arc::downgrade(&self.ty), vec![]),
        )?;
        match &input_res.get_type() {
            Type::Object(input) => {
                self.ty.input.set(input.clone()).map_err(|_| {
                    eyre!(
                        "OnceLock: cannot set function input type more than once; key={:?}",
                        self.ty.key()
                    )
                })?;
            }
            _ => bail!("expected object type for function input"),
        }
        input_res.finalize(conv)?;

        let mut output_res = conv.convert_type(
            weak,
            self.output_idx,
            RelativePath::output(Arc::downgrade(&self.ty), vec![]),
        )?;
        self.ty.output.set(output_res.get_type()).map_err(|_| {
            eyre!(
                "OnceLock: cannot set function output type more than once; key={:?}",
                self.ty.key()
            )
        })?;
        output_res.finalize(conv)?;

        Ok(())
    }
}
