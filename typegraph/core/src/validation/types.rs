// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::global_store::Store;
use crate::types::{Type, TypeId};
use crate::wit::core::TypeFunc;
use crate::{errors, Result};

impl TypeFunc {
    pub fn validate(&self, s: &Store) -> Result<()> {
        if let Ok(inp_id) = TypeId(self.inp).resolve_proxy() {
            let inp_type = inp_id.as_type()?;
            let Type::Struct(_) = inp_type else {
                return Err(errors::invalid_input_type(&s.get_type_repr(inp_id)?));
            };
        }

        let mat = Store::get_materializer(self.mat)?;
        mat.validate(s, self)?;

        Ok(())
    }
}

pub(super) mod utils {
    use crate::types::TypeId;

    use super::*;

    pub fn is_equal(left: TypeId, right: TypeId) -> Result<bool> {
        if left == right {
            Ok(true)
        } else {
            match left.resolve_proxy() {
                Ok(left_id) => Ok(right
                    .resolve_proxy()
                    .map_or(left_id == right, |right_id| left_id == right_id)),

                // left is a proxy that could not be resolved
                // -> right must be a proxy for the types to be equal
                Err(_) => match (left.as_type()?, right.as_type()?) {
                    (Type::Proxy(left_proxy), Type::Proxy(right_proxy)) => {
                        Ok(left_proxy.data.name == right_proxy.data.name)
                    }
                    _ => Ok(false),
                },
            }
        }
    }
}
