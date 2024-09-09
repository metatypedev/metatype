// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{collections::HashMap, rc::Rc};

use crate::errors::{self, ErrorContext, Result};
use crate::global_store::Store;
use crate::types::{Type, TypeDef, TypeId};

#[derive(Clone, Debug)]
pub struct TypeRef {
    pub id: TypeId,
    pub name: String,
    pub attributes: Rc<HashMap<String, String>>,
}

impl TypeRef {
    pub fn new(id: TypeId, name: String, attributes: Vec<(String, String)>) -> Self {
        Self {
            id,
            name,
            attributes: attributes.into_iter().collect::<HashMap<_, _>>().into(),
        }
    }

    pub fn resolve(&self) -> Result<Option<TypeDef>> {
        match Store::get_type_by_name(&self.name) {
            Some(type_id) => {
                let typ = type_id.as_type().context("resolving ref")?;
                match typ {
                    Type::Ref(r) => Err(errors::nested_type_ref(&self.name, &r.name)),
                    Type::Def(d) => Ok(Some(d)),
                }
            }
            None => Ok(None),
        }
    }

    pub fn try_resolve(&self) -> Result<TypeDef> {
        match self.resolve()? {
            Some(t) => Ok(t),
            None => Err(errors::unregistered_type_name(&self.name)),
        }
    }

    pub fn resolve_ref(&self) -> Result<(RefData, TypeDef)> {
        let ref_data = RefData {
            id: self.id,
            attributes: self.attributes.clone(),
        };

        let type_def = self.try_resolve()?;
        Ok((ref_data, type_def))
    }

    pub fn repr(&self) -> String {
        let attrs = self
            .attributes
            .iter()
            .map(|(k, v)| format!(", [{}] => '{}'", k, v))
            .collect::<Vec<_>>()
            .join("");
        format!("ref(#{} , target_name: '{}'{attrs})", self.id.0, self.name)
    }
}

#[derive(Debug)]
pub struct RefData {
    pub id: TypeId,
    pub attributes: Rc<HashMap<String, String>>,
}
