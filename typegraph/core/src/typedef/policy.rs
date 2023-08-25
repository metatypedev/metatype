// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    conversion::types::TypeConversion,
    errors::Result,
    global_store::{with_store, Store},
    typegraph::TypegraphContext,
    types::{TypeData, TypeId, WithPolicy, WrapperTypeData},
    wit::core::{PolicySpec, TypePolicy},
};
use common::typegraph::TypeNode;

impl TypeConversion for WithPolicy {
    fn convert(&self, ctx: &mut TypegraphContext) -> Result<TypeNode> {
        with_store(|s| -> Result<_> {
            let tpe = s.get_type(self.data.tpe.into())?;
            let mut type_node = tpe.convert(ctx)?;
            let base = type_node.base_mut();
            base.policies = ctx.register_policy_chain(&self.data.chain)?;
            Ok(type_node)
        })
    }
}

impl TypeData for TypePolicy {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        params.push(format!(
            "policy='[{}]'",
            self.chain
                .iter()
                .map(|p| match p {
                    PolicySpec::Simple(pol_id) => format!(
                        "'{}'",
                        with_store(|s| s.get_policy(*pol_id).unwrap().name.clone())
                    ),
                    PolicySpec::PerEffect(p) => with_store(|s| format!(
                        "{{create='{}', update='{}', delete='{}', none='{}'}}",
                        p.create
                            .map(|pol_id| s.get_policy(pol_id).unwrap().name.as_str())
                            .unwrap_or("null"),
                        p.update
                            .map(|pol_id| s.get_policy(pol_id).unwrap().name.as_str())
                            .unwrap_or("null"),
                        p.delete
                            .map(|pol_id| s.get_policy(pol_id).unwrap().name.as_str())
                            .unwrap_or("null"),
                        p.none
                            .map(|pol_id| s.get_policy(pol_id).unwrap().name.as_str())
                            .unwrap_or("null"),
                    )),
                })
                .collect::<Vec<_>>()
                .join(", ")
        ));
    }

    fn variant_name(&self) -> String {
        "policy".to_string()
    }
}

impl WrapperTypeData for TypePolicy {
    fn resolve(&self, _store: &Store) -> Option<TypeId> {
        Some(self.tpe.into())
    }
}
