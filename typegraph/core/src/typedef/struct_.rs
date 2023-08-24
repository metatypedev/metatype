// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{ObjectTypeData, TypeNode};
use errors::Result;
use indexmap::IndexMap;

use crate::{
    conversion::types::{gen_base, TypeConversion},
    errors,
    global_store::with_store,
    typegraph::TypegraphContext,
    types::{Struct, TypeData},
    wit::core::{TypeId, TypeStruct},
};

impl TypeConversion for Struct {
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
        Ok(TypeNode::Object {
            base: gen_base(format!("object_{}", self.id), runtime_id.unwrap()),
            data: ObjectTypeData {
                properties: self
                    .data
                    .props
                    .iter()
                    .map(|(name, type_id)| -> Result<(String, TypeId)> {
                        with_store(|s| -> Result<_> {
                            let id = s.resolve_proxy(*type_id)?;
                            Ok((name.clone(), ctx.register_type(s, id, runtime_id)?))
                        })
                    })
                    .collect::<Result<IndexMap<_, _>>>()?,
                required: Vec::new(),
            },
        })
    }
}

impl TypeData for TypeStruct {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        for (name, tpe_id) in self.props.iter() {
            params.push(format!("[{}] => #{}", name, tpe_id));
        }
    }

    fn variant_name(&self) -> String {
        "struct".to_string()
    }
}
