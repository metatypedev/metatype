// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    conversion::types::TypeConversion,
    errors::Result,
    global_store::Store,
    typegraph::TypegraphContext,
    types::{TypeData, TypeId, WithPolicy, WrapperTypeData},
    wit::core::{PolicyId, PolicySpec, TypePolicy},
};
use common::typegraph::TypeNode;

impl TypeConversion for WithPolicy {
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
        let tpe = TypeId(self.data.tpe).as_type()?;
        let mut type_node = tpe.convert(ctx, runtime_id)?;
        let base = type_node.base_mut();
        base.policies = ctx.register_policy_chain(&self.data.chain)?;
        Ok(type_node)
    }
}

fn get_policy_name(pol_id: PolicyId) -> String {
    Store::get_policy(pol_id).unwrap().name.clone()
}

impl TypeData for TypePolicy {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        params.push(format!(
            "policy='[{}]'",
            self.chain
                .iter()
                .map(|p| match p {
                    PolicySpec::Simple(pol_id) => format!("'{}'", get_policy_name(*pol_id)),
                    PolicySpec::PerEffect(p) => format!(
                        "{{create='{}', update='{}', delete='{}', read='{}'}}",
                        p.create
                            .map(get_policy_name)
                            .unwrap_or_else(|| "null".to_string()),
                        p.update
                            .map(get_policy_name)
                            .unwrap_or_else(|| "null".to_string()),
                        p.delete
                            .map(get_policy_name)
                            .unwrap_or_else(|| "null".to_string()),
                        p.read
                            .map(get_policy_name)
                            .unwrap_or_else(|| "null".to_string()),
                    ),
                })
                .collect::<Vec<_>>()
                .join(", ")
        ));
    }

    fn variant_name(&self) -> String {
        "policy".to_string()
    }

    super::impl_into_type!(wrapper, WithPolicy);
}

impl WrapperTypeData for TypePolicy {
    fn resolve(&self) -> Option<TypeId> {
        Some(self.tpe.into())
    }
}
