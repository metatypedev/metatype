// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::hash::Hash as _;

use common::typegraph::{
    parameter_transform::FunctionParameterTransform, FunctionTypeData, TypeNode,
};

use crate::conversion::hash::Hashable;
use crate::conversion::parameter_transform::convert_tree;
use crate::conversion::types::{BaseBuilderInit, TypeConversion};
use crate::errors::{self, Result, TgError};
use crate::params::apply::ParameterTransformNode;
use crate::typegraph::TypegraphContext;
use crate::types::{Func, RefAttrs, ResolveRef as _, TypeDef, TypeDefData, TypeId};
use crate::wit::core::TypeFunc;

impl TypeConversion for Func {
    fn convert(
        &self,
        ctx: &mut TypegraphContext,
        _runtime_id: Option<u32>,
        _ref_attrs: &RefAttrs,
    ) -> Result<TypeNode> {
        let (mat_id, runtime_id) = ctx.register_materializer(self.data.mat)?;

        let input = {
            let inp_id = TypeId(self.data.inp);
            match TypeId(self.data.inp).resolve_ref()?.0 {
                TypeDef::Struct(_) => Ok(ctx.register_type(inp_id, Some(runtime_id))?),
                _ => Err(errors::invalid_input_type(&inp_id.repr()?)),
            }
        }?
        .into();

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
        Ok(TypeNode::Function {
            base: BaseBuilderInit {
                ctx,
                base_name: "func",
                type_id: self.id,
                name: self.base.name.clone(),
                runtime_idx: runtime_id,
                policies: &self.extended_base.policies,
                runtime_config: self.base.runtime_config.as_deref(),
            }
            .init_builder()?
            .build()?,
            data: FunctionTypeData {
                input,
                parameter_transform,
                output,
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
