// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::conversion::hash::Hashable;
use crate::conversion::parameter_transform::convert_tree;
use crate::conversion::types::{BaseBuilderInit, TypeConversion};
use crate::errors::{self, Result, TgError};
use crate::global_store::Store;
use crate::params::apply::ParameterTransformNode;
use crate::runtimes::random::collect_random_runtime_config;
use crate::runtimes::Runtime;
use crate::typegraph::TypegraphContext;
use crate::types::{
    AsTypeDefEx as _, ExtendedTypeDef, FindAttribute as _, Func, InjectionTree, RefAttr, Struct,
    TypeDef, TypeDefData, TypeId,
};
use crate::wit::core::TypeFunc;
use common::typegraph::{
    parameter_transform::FunctionParameterTransform, FunctionTypeData, TypeNode,
};
use common::typegraph::{Injection, InjectionData, InjectionNode};
use indexmap::IndexMap;
use std::collections::HashSet;
use std::hash::Hash as _;
use std::rc::Rc;

impl TypeConversion for Func {
    fn convert(&self, ctx: &mut TypegraphContext, xdef: ExtendedTypeDef) -> Result<TypeNode> {
        let mat_id = ctx.register_materializer(self.data.mat)?;

        let inp_id = TypeId(self.data.inp);
        let (input, mut injection_tree) = match TypeId(self.data.inp).as_xdef()?.type_def {
            TypeDef::Struct(s) => (
                ctx.register_type(inp_id)?.into(),
                collect_injections(s, Default::default())?,
            ),
            _ => return Err(errors::invalid_input_type(&inp_id.repr()?)),
        };

        let out_id = TypeId(self.data.out);
        let output = ctx.register_type(out_id)?.into();
        let outjection_tree = match out_id.as_xdef()?.type_def {
            TypeDef::Struct(s) => collect_injections(s, Default::default())?,
            _ => Default::default(),
        };

        let parameter_transform = self
            .data
            .parameter_transform
            .as_ref()
            .map(|transform| -> Result<_> {
                let resolver_input = TypeId(transform.resolver_input);
                let transform_root: ParameterTransformNode =
                    serde_json::from_str(&transform.transform_tree).map_err(|e| {
                        TgError::from(format!("Failed to parse transform_root: {}", e))
                    })?;

                let transform_root = convert_tree(ctx, &transform_root)?;
                Ok(FunctionParameterTransform {
                    resolver_input: match resolver_input.as_xdef()?.type_def {
                        TypeDef::Struct(_) => ctx.register_type(resolver_input)?,
                        _ => return Err(errors::invalid_input_type(&resolver_input.repr()?)),
                    }
                    .into(),
                    transform_root,
                })
            })
            .transpose()?;
        for reduce_tree in xdef.attributes.find_reduce_trees() {
            InjectionTree::merge(&mut injection_tree.0, reduce_tree.0.clone());
        }

        Ok(TypeNode::Function {
            base: BaseBuilderInit {
                ctx,
                base_name: "func",
                type_id: self.id,
                name: xdef.get_owned_name(),
                policies: xdef.attributes.find_policy().unwrap_or(&[]),
            }
            .init_builder()?
            .build()?,
            data: FunctionTypeData {
                input,
                parameter_transform,
                output,
                injections: injection_tree.0,
                outjections: outjection_tree.0,
                runtime_config: self.collect_runtime_config(ctx)?,
                materializer: mat_id,
                rate_calls: self.data.rate_calls,
                rate_weight: self.data.rate_weight,
            },
        })
    }
}

impl TypeDefData for TypeFunc {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        params.push(format!("#{} => #{}", self.inp, self.out));
    }

    fn variant_name(&self) -> &'static str {
        "func"
    }
}

impl Hashable for TypeFunc {
    fn hash(
        &self,
        hasher: &mut crate::conversion::hash::Hasher,
        tg: &mut TypegraphContext,
    ) -> Result<()> {
        "func".hash(hasher);
        self.mat.hash(hasher);
        self.rate_calls.hash(hasher);
        self.rate_weight.hash(hasher);
        if let Some(transform) = &self.parameter_transform {
            transform.transform_tree.hash(hasher);
            TypeId(transform.resolver_input).hash_child_type(hasher, tg)?;
        }
        TypeId(self.inp).hash_child_type(hasher, tg)?;
        TypeId(self.out).hash_child_type(hasher, tg)?;
        Ok(())
    }
}

/// Note: only direct children of t.struct support injections; only if they
/// are not part of a polymorphic type (unions)
// FIXME: emit a warning if any other type has injections -- (typegraph-ng)
fn collect_injections(
    input_type: Rc<Struct>,
    mut visited: HashSet<TypeId>,
) -> Result<InjectionTree> {
    if !visited.insert(input_type.id) {
        return Ok(Default::default());
    }
    let mut res = IndexMap::new();

    for (name, prop_id) in input_type.data.props.iter() {
        let xdef = TypeId(*prop_id).as_xdef()?;
        let injection = xdef.attributes.find_injection();
        if let Some(injection) = injection {
            let mut injection = injection.clone();
            if let Injection::Random(random_inj) = &mut injection {
                let value = collect_random_runtime_config(TypeId(*prop_id))?
                    .map(|gen| {
                        serde_json::to_value(gen).map_err(|e| {
                            format!("Failed to serialize random runtime config: {}", e)
                        })
                    })
                    .transpose()?
                    .unwrap_or(serde_json::Value::Null);
                match random_inj {
                    InjectionData::SingleValue(v) => {
                        v.value = value;
                    }
                    InjectionData::ValueByEffect(vv) => vv.values_mut().for_each(|v| {
                        *v = value.clone();
                    }),
                }
            }
            res.insert(name.clone(), InjectionNode::Leaf { injection });
        } else {
            let type_def = resolve_quantifiers(xdef.type_def, |_| ())?;
            match type_def {
                TypeDef::Struct(s) => {
                    let children = collect_injections(s, visited.clone())?;
                    if !children.0.is_empty() {
                        res.insert(
                            name.clone(),
                            InjectionNode::Parent {
                                children: children.0,
                            },
                        );
                    }
                }
                _ => {
                    // TODO emit a warning if any descendant have injections
                }
            }
        }
    }

    Ok(InjectionTree(res))
}

fn resolve_quantifiers(
    type_def: TypeDef,
    consume_attributes: impl Fn(Vec<Rc<RefAttr>>),
) -> Result<TypeDef> {
    match type_def {
        TypeDef::Optional(inner) => {
            let xdef = TypeId(inner.data.of).as_xdef()?;
            consume_attributes(xdef.attributes);
            resolve_quantifiers(xdef.type_def, consume_attributes)
        }
        TypeDef::List(inner) => {
            let xdef = TypeId(inner.data.of).as_xdef()?;
            consume_attributes(xdef.attributes);
            resolve_quantifiers(xdef.type_def, consume_attributes)
        }
        _ => Ok(type_def),
    }
}

impl Func {
    fn collect_runtime_config(&self, _ctx: &mut TypegraphContext) -> Result<serde_json::Value> {
        let mat = Store::get_materializer(self.data.mat)?;
        let runtime = Store::get_runtime(mat.runtime_id)?;
        match runtime {
            Runtime::Random(_) => Self::collect_random_runtime_config(TypeId(self.data.out)),
            _ => Ok(serde_json::Value::Null),
        }
    }

    fn collect_random_runtime_config(out_type: TypeId) -> Result<serde_json::Value> {
        serde_json::to_value(&collect_random_runtime_config(out_type)?)
            .map_err(|e| format!("Failed to serialize random runtime config: {}", e).into())
    }
}
