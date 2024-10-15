// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::conversion::hash::Hashable;
use crate::conversion::parameter_transform::convert_tree;
use crate::conversion::types::{BaseBuilderInit, TypeConversion};
use crate::errors::{self, Result, TgError};
use crate::params::apply::ParameterTransformNode;
use crate::typegraph::TypegraphContext;
use crate::types::{
    FindAttribute as _, Func, InjectionTree, RefAttr, RefAttrs, ResolveRef as _, Struct, TypeDef,
    TypeDefData, TypeId,
};
use crate::wit::core::TypeFunc;
use common::typegraph::InjectionNode;
use common::typegraph::{
    parameter_transform::FunctionParameterTransform, FunctionTypeData, TypeNode,
};
use indexmap::IndexMap;
use std::collections::HashSet;
use std::hash::Hash as _;
use std::rc::Rc;

impl TypeConversion for Func {
    fn convert(
        &self,
        ctx: &mut TypegraphContext,
        _runtime_id: Option<u32>,
        ref_attrs: &RefAttrs,
    ) -> Result<TypeNode> {
        let (mat_id, runtime_id) = ctx.register_materializer(self.data.mat)?;

        let inp_id = TypeId(self.data.inp);
        let (input, mut injection_tree) = match TypeId(self.data.inp).resolve_ref()?.0 {
            TypeDef::Struct(s) => (
                ctx.register_type(inp_id, Some(runtime_id))?.into(),
                collect_injections(s, Default::default())?,
            ),
            _ => return Err(errors::invalid_input_type(&inp_id.repr()?)),
        };

        let output = ctx
            .register_type(TypeId(self.data.out), Some(runtime_id))?
            .into();

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

                let transform_root = convert_tree(ctx, &transform_root, runtime_id)?;
                Ok(FunctionParameterTransform {
                    resolver_input: match resolver_input.resolve_ref()?.0 {
                        TypeDef::Struct(_) => {
                            ctx.register_type(resolver_input, Some(runtime_id))?
                        }
                        _ => return Err(errors::invalid_input_type(&resolver_input.repr()?)),
                    }
                    .into(),
                    transform_root,
                })
            })
            .transpose()?;
        for reduce_tree in ref_attrs.find_reduce_trees() {
            InjectionTree::merge(&mut injection_tree.0, reduce_tree.0.clone());
        }
        Ok(TypeNode::Function {
            base: BaseBuilderInit {
                ctx,
                base_name: "func",
                type_id: self.id,
                name: self.base.name.clone(),
                runtime_idx: runtime_id,
                policies: ref_attrs.find_policy().unwrap_or(&[]),
                runtime_config: self.base.runtime_config.as_deref(),
            }
            .init_builder()?
            .build()?,
            data: FunctionTypeData {
                input,
                parameter_transform,
                output,
                injections: injection_tree.0,
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
        runtime_id: Option<u32>,
    ) -> Result<()> {
        "func".hash(hasher);
        self.mat.hash(hasher);
        self.rate_calls.hash(hasher);
        self.rate_weight.hash(hasher);
        if let Some(transform) = &self.parameter_transform {
            transform.transform_tree.hash(hasher);
            TypeId(transform.resolver_input).hash_child_type(hasher, tg, runtime_id)?;
        }
        TypeId(self.inp).hash_child_type(hasher, tg, runtime_id)?;
        TypeId(self.out).hash_child_type(hasher, tg, runtime_id)?;
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
        let (type_def, attrs) = TypeId(*prop_id).resolve_ref()?;
        let injection = attrs.find_injection();
        if let Some(injection) = injection {
            res.insert(
                name.clone(),
                InjectionNode::Leaf {
                    injection: injection.clone(),
                },
            );
        } else {
            let type_def = resolve_quantifiers(type_def, |_| ())?;
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
            let (type_def, attrs) = TypeId(inner.data.of).resolve_ref()?;
            consume_attributes(attrs);
            resolve_quantifiers(type_def, consume_attributes)
        }
        TypeDef::List(inner) => {
            let (type_def, attrs) = TypeId(inner.data.of).resolve_ref()?;
            consume_attributes(attrs);
            resolve_quantifiers(type_def, consume_attributes)
        }
        _ => Ok(type_def),
    }
}
