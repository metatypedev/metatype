// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::global_store::Store;
use crate::types::T;
use crate::wit::core::{TypeFunc, TypeId};
use crate::{errors, Result};

impl TypeFunc {
    pub fn validate(&self, s: &Store) -> Result<()> {
        if let Ok(inp_id) = s.resolve_proxy(self.inp) {
            let inp_type = s.get_type(inp_id)?;
            let T::Struct(_) = inp_type else {
                return Err(errors::invalid_input_type(&s.get_type_repr(inp_id)?));
            };
        }

        let mat = s.get_materializer(self.mat)?;
        mat.validate(s, self)?;

        Ok(())
    }
}

pub(super) mod utils {
    use super::*;

    pub fn is_equal(s: &Store, left: TypeId, right: TypeId) -> Result<bool> {
        if left == right {
            Ok(true)
        } else {
            match s.resolve_proxy(left) {
                Ok(left_id) => Ok(s
                    .resolve_proxy(right)
                    .map_or(left_id == right, |right_id| left_id == right_id)),

                // left is a proxy that could not be resolved
                // -> right must be a proxy for the types to be equal
                Err(_) => match (s.get_type(left)?, s.get_type(right)?) {
                    (T::Proxy(left_proxy), T::Proxy(right_proxy)) => {
                        Ok(left_proxy.data.name == right_proxy.data.name)
                    }
                    _ => Ok(false),
                },
            }
        }
    }
}
