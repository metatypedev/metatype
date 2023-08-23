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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
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
                    type_id = s.resolve_proxy(type_id)?;
                    continue;
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

#[derive(Clone, Debug)]
pub struct RelationshipSource {
    pub model_type: TypeId,
    pub model_type_name: String,
    pub wrapper_type: TypeId,
    pub cardinality: Cardinality,
}

// no wrapper type; to be determined later
#[derive(Clone, Debug)]
pub struct RelationshipTarget {
    pub model_type: TypeId,
    /// field of this model pointing to the other side of the relationship
    pub field: String,
    // /// cardinality for the other side of the relationship;
    // /// telling whether the field has a type M, M?, or M[]
    // pub cardinality: Cardinality,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct RelationshipModel {
    pub model_type: TypeId,
    pub model_name: String,
    pub wrapper_type: TypeId,
    pub cardinality: Cardinality,
    pub field: String,
}

impl RelationshipModel {
    pub fn from_source(source: RelationshipSource, field: String) -> Self {
        Self {
            model_type: source.model_type,
            model_name: source.model_type_name,
            wrapper_type: source.wrapper_type,
            cardinality: source.cardinality,
            field,
        }
    }

    pub fn get_rel_name(&self) -> Result<Option<String>> {
        with_store(|s| -> Result<_> {
            let target_type = s
                .type_as_struct(self.model_type)?
                .data
                .get_prop(&self.field);
            target_type
                .map(get_rel_name)
                .transpose()
                .map(|o| o.flatten())
        })
    }
}

/// Possible cardinalities are:
/// (Optional, Optional): [Left] 0..1 --> 0..1 [Right]
/// (One, Optional): [Left] 1..1 --> 0..1 [Right]
/// (Optional, Many) [Left] 0..1 --> 0..n [Right]
/// (One, Many) [Left] 1..1 --> 0..n [Right]
/// The model on the right will have the foreign key
#[derive(Debug)]
pub struct Relationship {
    pub name: String,
    pub left: RelationshipModel,
    pub right: RelationshipModel,
}

impl TryFrom<(RelationshipModel, RelationshipModel)> for Relationship {
    type Error = TgError;

    fn try_from(pair: (RelationshipModel, RelationshipModel)) -> Result<Self, Self::Error> {
        let (first, second) = pair;
        let (left, right) = match (first.cardinality, second.cardinality) {
            (Cardinality::One, Cardinality::One)
            | (Cardinality::Optional, Cardinality::Optional) => {
                todo!()
            }
            (Cardinality::One, Cardinality::Optional)
            | (Cardinality::One, Cardinality::Many)
            | (Cardinality::Optional, Cardinality::Many) => (first, second),
            (Cardinality::Optional, Cardinality::One)
            | (Cardinality::Many, Cardinality::One)
            | (Cardinality::Many, Cardinality::Optional) => (second, first),
            (Cardinality::Many, Cardinality::Many) => {
                return Err("Many to many relationship not supported".to_string());
            }
        };

        let name = match (left.get_rel_name()?, right.get_rel_name()?) {
            (None, None) => {
                let left_name = with_store(|s| -> Result<_> {
                    s.get_type_name(left.model_type)?
                        .map(|s| s.to_string())
                        .ok_or_else(|| "Prisma model must have explicit name".to_string())
                })?;
                let right_name = with_store(|s| -> Result<_> {
                    s.get_type_name(right.model_type)?
                        .map(|s| s.to_string())
                        .ok_or_else(|| "Prisma model must have explicit name".to_string())
                })?;
                format!("{}To{}", left_name, right_name)
            }
            (Some(name), None) => name,
            (None, Some(name)) => name,
            (Some(name1), Some(name2)) => {
                if name1 == name2 {
                    name1
                } else {
                    return Err("Relationship names do not match".to_string());
                }
            }
        };

        Ok(Relationship { name, left, right })
    }
}

use registry::RelationshipRegistry;

#[cfg(test)]
mod test {
    use crate::errors::Result;
    use crate::global_store::with_store;
    use crate::runtimes::prisma::relationship::registry::RelationshipRegistry;
    use crate::test_utils::*;

    #[test]
    fn test_implicit_relationships() -> Result<(), String> {
        let user = t::struct_()
            .prop("id", t::integer().with_base(|b| b.as_id())?)
            .prop("name", t::string().build()?)
            .prop("posts", t::array(t::proxy("Post").build()?).build()?)
            .with_base(|b| b.named("User"))?;

        let post = t::struct_()
            .prop("id", t::integer().with_base(|b| b.as_id())?)
            .prop("title", t::string().build()?)
            .prop("author", t::proxy("User").build()?)
            .with_base(|b| b.named("Post"))?;

        let registry = with_store(|s| -> Result<_> {
            let models = [s.type_as_struct(user)?, s.type_as_struct(post)?];
            let reg = RelationshipRegistry::from(&models)?;
            Ok(reg)
        })?;

        insta::assert_debug_snapshot!("implicit relationship", registry);

        Ok(())
    }

    #[test]
    fn test_explicit_relationship_name() -> Result<(), String> {
        let user = t::struct_()
            .prop("id", t::integer().with_base(|b| b.as_id())?)
            .prop("name", t::string().build()?)
            .prop("posts", t::array(t::proxy("Post").build()?).build()?)
            .with_base(|b| b.named("User"))?;

        let post = t::struct_()
            .prop("id", t::integer().with_base(|b| b.as_id())?)
            .prop("title", t::string().build()?)
            .prop("author", prisma_linkn("User").name("PostAuthor").build()?)
            .with_base(|b| b.named("Post"))?;

        let registry = with_store(|s| -> Result<_> {
            let models = [s.type_as_struct(user)?, s.type_as_struct(post)?];
            let reg = RelationshipRegistry::from(&models)?;
            Ok(reg)
        })?;

        insta::assert_debug_snapshot!("explicitly named relationship", registry);

        Ok(())
    }

    #[test]
    fn test_self_relationship() -> Result<(), String> {
        let node = t::struct_()
            .prop("id", t::string().with_base(|b| b.as_id())?)
            .prop("children", t::array(t::proxy("Node").build()?).build()?)
            .prop("parent", t::proxy("Node").build()?)
            .with_base(|b| b.named("Node"))?;

        let registry = with_store(|s| -> Result<_> {
            let models = [s.type_as_struct(node)?];
            Ok(RelationshipRegistry::from(&models)?)
        });

        insta::assert_debug_snapshot!("self relationship", registry);

        Ok(())
    }
}
