// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

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

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct RelationshipModel {
    pub model: TypeId,
    pub field: String,
    pub cardinality: Cardinality,
}

pub struct Relationship {
    pub name: String,
    pub left: RelationshipModel,
    pub right: RelationshipModel,
}

impl TryFrom<(RelationshipModel, RelationshipModel)> for Relationship {
    type Error = TgError;

    fn try_from(value: (RelationshipModel, RelationshipModel)) -> Result<Self, Self::Error> {
        let (left, right) = value;
        let left_name = left.rel_name()?;
        let right_name = right.rel_name()?;
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
