// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::global_store::with_store;
use crate::types::Type;
use crate::types::TypeFun;
use crate::wit::core::TypeId;
use crate::wit::runtimes::Error as TgError;

mod discovery;
mod registry;

#[derive(Clone, Copy, PartialEq, Eq, Hash)]
pub enum Cardinality {
    Optional,
    One,
    Many,
}

fn get_rel_name(wrapper_type: TypeId) -> Result<Option<String>> {
    with_store(|s| {
        let mut type_id = wrapper_type;

        loop {
            let ty = s.get_type(type_id)?;
            match ty {
                Type::Proxy(p) => {
                    if let Some(name) = p.data.get_extra("rel_name") {
                        return Ok(Some(name.to_string()));
                    }
                }
                _ => {
                    if let Some(wrapper_type) = ty.as_wrapper_type() {
                        type_id = wrapper_type.get_wrapped_type(s).unwrap();
                        continue;
                    } else {
                        // concrete type
                        return Ok(None);
                    }
                }
            }
        }
    })
}

#[derive(Clone)]
pub struct RelationshipSource {
    pub model_type: TypeId,
    pub wrapper_type: TypeId,
    pub cardinality: Cardinality,
}

// no wrapper type; to be determined later
#[derive(Clone)]
pub struct RelationshipTarget {
    pub model_type: TypeId,
    /// field of this model pointing to the other side of the relationship
    pub field: String,
    // /// cardinality for the other side of the relationship;
    // /// telling whether the field has a type M, M?, or M[]
    // pub cardinality: Cardinality,
}

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct RelationshipModel {
    pub model_type: TypeId,
    pub wrapper_type: TypeId,
    pub cardinality: Cardinality,
    pub field: String,
}

impl RelationshipModel {
    pub fn from_source(source: RelationshipSource, field: String) -> Self {
        Self {
            model_type: source.model_type,
            wrapper_type: source.wrapper_type,
            cardinality: source.cardinality,
            field,
        }
    }
}

/// Possible cardinalities are:
/// (Optional, Optional): [Left] 0..1 --> 0..1 [Right]
/// (One, Optional): [Left] 1..1 --> 0..1 [Right]
/// (Optional, Many) [Left] 0..1 --> 0..n [Right]
/// (One, Many) [Left] 1..1 --> 0..n [Right]
/// The model on the right will have the foreign key
pub struct Relationship {
    pub name: String,
    pub left: RelationshipModel,
    pub right: RelationshipModel,
}

impl TryFrom<(RelationshipModel, RelationshipModel)> for Relationship {
    type Error = TgError;

    fn try_from(value: (RelationshipModel, RelationshipModel)) -> Result<Self, Self::Error> {
        let (left, right) = value;
        let left_name = get_rel_name(left.wrapper_type)?;
        let right_name = get_rel_name(right.wrapper_type)?;
        let name = match (left_name, right_name) {
            (None, None) => {
                // generate name
                "".to_string()
            }
            (Some(n), None) | (None, Some(n)) => n,
            (Some(n1), Some(n2)) => {
                if n1 != n2 {
                    return Err(format!("relationship names do not match: {} != {}", n1, n2));
                }
                n1
            }
        };

        Ok(Self { name, left, right })
    }
}

use registry::RelationshipRegistry;
