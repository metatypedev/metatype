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

impl TypeStruct {
    pub fn get_prop(&self, key: &str) -> Option<TypeId> {
        self.props
            .iter()
            .filter(|(k, _)| k == key)
            .map(|(_, v)| *v)
            .next()
    }
}

impl TypeConversion for Struct {
    fn convert(&self, ctx: &mut TypegraphContext) -> Result<TypeNode> {
        Ok(TypeNode::Object {
            base: gen_base(format!("object_{}", self.id.0)),
            data: ObjectTypeData {
                properties: self
                    .data
                    .props
                    .iter()
                    .map(|(name, type_id)| -> Result<(String, TypeId)> {
                        with_store(|s| -> Result<_> {
                            let id = s.resolve_proxy((*type_id).into())?;
                            Ok((name.clone(), ctx.register_type(s, id)?.into()))
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

impl TypeStruct {
    pub fn get_prop_type(&self, name: &str) -> Option<TypeId> {
        self.props
            .iter()
            .find_map(|(n, t)| if n == name { Some(*t) } else { None })
    }
}
