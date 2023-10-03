// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::t;
use crate::t::TypeBuilder;
use crate::types::TypeId;

mod discovery;
pub mod registry;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Cardinality {
    Optional,
    One,
    Many,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct RelationshipModel {
    pub model_type: TypeId,
    pub model_name: String,
    pub wrapper_type: TypeId,
    pub cardinality: Cardinality,
    pub field: String,
}

#[derive(Debug, Clone, Copy)]
pub enum Side {
    Left,
    Right,
}

impl Side {
    #[allow(dead_code)]
    pub fn opposite(&self) -> Self {
        match self {
            Side::Left => Side::Right,
            Side::Right => Side::Left,
        }
    }
}

/// Possible cardinalities are:
/// (Optional, Optional): [Left] 0..1 --> 0..1 [Right]
/// (One, Optional): [Left] 1..1 --> 0..1 [Right]
/// (Optional, Many) [Left] 0..1 --> 0..n [Right]
/// (One, Many) [Left] 1..1 --> 0..n [Right]
/// The model on the right will have the foreign key
#[derive(Debug, Clone)]
pub struct Relationship {
    pub name: String,
    pub left: RelationshipModel,
    pub right: RelationshipModel,
}

pub enum SideOfModel {
    Left,
    Right,
    Both,
    None,
}

impl Relationship {
    pub fn get_opposite_of(&self, model_id: TypeId, field: &str) -> Option<&RelationshipModel> {
        use SideOfModel as S;
        match self.side_of_model(model_id) {
            S::Both => {
                if self.left.field == field {
                    Some(&self.right)
                } else if self.right.field == field {
                    Some(&self.left)
                } else {
                    unreachable!()
                }
            }
            S::Left => Some(&self.right),
            S::Right => Some(&self.left),
            S::None => None,
        }
    }

    fn side_of_model(&self, model_type: TypeId) -> SideOfModel {
        use SideOfModel as S;
        if self.left.model_type == self.right.model_type {
            if self.left.model_type == model_type {
                S::Both
            } else {
                S::None
            }
        } else if self.left.model_type == model_type {
            S::Left
        } else if self.right.model_type == model_type {
            S::Right
        } else {
            S::None
        }
    }

    pub fn side_of_type(&self, type_id: TypeId) -> Option<Side> {
        if self.left.wrapper_type == type_id {
            Some(Side::Left)
        } else if self.right.wrapper_type == type_id {
            Some(Side::Right)
        } else {
            None
        }
    }

    pub fn get(&self, side: Side) -> &RelationshipModel {
        match side {
            Side::Left => &self.left,
            Side::Right => &self.right,
        }
    }
}

#[derive(Default, Clone)]
pub struct PrismaLink {
    type_name: String,
    rel_name: Option<String>,
    fkey: Option<bool>,
    target_field: Option<String>,
    unique: bool,
}

impl PrismaLink {
    pub fn name(mut self, n: impl Into<String>) -> Self {
        self.rel_name = Some(n.into());
        self
    }

    pub fn fkey(mut self, fk: bool) -> Self {
        self.fkey = Some(fk);
        self
    }

    pub fn field(mut self, field: impl Into<String>) -> Self {
        self.target_field = Some(field.into());
        self
    }

    pub fn unique(mut self, unique: bool) -> Self {
        self.unique = unique;
        self
    }

    pub fn build(mut self) -> Result<TypeId> {
        let mut proxy = t::proxy(self.type_name);
        if let Some(rel_name) = self.rel_name.take() {
            proxy.set("rel_name", rel_name);
        }
        if let Some(fkey) = self.fkey {
            proxy.set("fkey", format!("{fkey}"));
        }
        if let Some(target_field) = self.target_field.take() {
            proxy.set("target_field", target_field);
        }
        let res = proxy.build()?;
        eprintln!("proxy: {:?}", res);
        Ok(res)
    }
}

impl TypeBuilder for PrismaLink {
    fn build(&mut self) -> Result<TypeId> {
        self.clone().build()
    }
}

#[allow(dead_code)]
pub fn prisma_linkx(mut typ: impl TypeBuilder) -> Result<PrismaLink> {
    prisma_link(typ.build()?)
}

pub fn prisma_link(type_id: TypeId) -> Result<PrismaLink> {
    let name = type_id
        .type_name()?
        .ok_or_else(|| "Prisma link target must be named".to_string())?;
    Ok(prisma_linkn(name))
}

pub fn prisma_linkn(name: impl Into<String>) -> PrismaLink {
    PrismaLink {
        type_name: name.into(),
        ..Default::default()
    }
}

use registry::RelationshipRegistry;

#[cfg(test)]
mod test {
    use super::{prisma_linkn, prisma_linkx};
    use crate::errors::Result;
    use crate::global_store::Store;
    use crate::runtimes::prisma::errors;
    use crate::runtimes::prisma::relationship::registry::RelationshipRegistry;
    use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
    use crate::test_utils::*;

    #[test]
    fn test_implicit_relationships() -> Result<(), String> {
        let (user, _post) = models::simple_relationship()?;

        let mut reg = RelationshipRegistry::default();
        reg.manage(user)?;

        insta::assert_debug_snapshot!("implicit relationship", reg);

        Ok(())
    }

    #[test]
    fn test_explicit_relationship_name() -> Result<(), String> {
        Store::reset();
        let user = t::struct_()
            .propx("id", t::integer().as_id(true))?
            .propx("name", t::string())?
            .propx("posts", t::arrayx(t::proxy("Post"))?)?
            .named("User")
            .build()?;

        let post = t::struct_()
            .propx("id", t::integer().as_id(true))?
            .propx("title", t::string())?
            .propx("author", prisma_linkn("User").name("PostAuthor"))?
            .named("Post")
            .build()?;

        let mut reg = RelationshipRegistry::default();
        reg.manage(user)?;
        reg.manage(post)?;

        insta::assert_debug_snapshot!("explicitly named relationship", reg);

        Ok(())
    }

    #[test]
    fn test_fkey_attribute() -> Result<(), String> {
        Store::reset();
        let user = t::struct_()
            .propx("id", t::integer().as_id(true))?
            .propx(
                "profile",
                prisma_linkx(t::optionalx(t::proxy("Profile"))?)?.fkey(true),
            )?
            .named("User")
            .build()?;

        let profile = t::struct_()
            .propx("id", t::integer().as_id(true))?
            .propx("user", t::optionalx(t::proxy("User"))?)?
            .named("Profile")
            .build()?;

        let mut reg = RelationshipRegistry::default();
        reg.manage(user)?;
        reg.manage(profile)?;

        insta::assert_debug_snapshot!("fkey attribute", reg);

        Ok(())
    }

    #[test]
    fn test_unique_attribute() -> Result<(), String> {
        Store::reset();
        let user = t::struct_()
            .propx("id", t::integer().as_id(true))?
            .propx(
                "profile",
                t::optionalx(t::proxy("Profile"))?.config("unique", "true"),
            )?
            .named("User")
            .build()?;

        let profile = t::struct_()
            .propx("id", t::integer().as_id(true))?
            .propx("user", t::optionalx(t::proxy("User"))?)?
            .named("Profile")
            .build()?;

        let mut reg = RelationshipRegistry::default();
        reg.manage(user)?;
        reg.manage(profile)?;

        insta::assert_debug_snapshot!("unique attribute", reg);

        Ok(())
    }

    #[test]
    fn test_self_relationship() -> Result<(), String> {
        Store::reset();
        let node = t::struct_()
            .propx("id", t::string().as_id(true))?
            .propx("children", t::arrayx(t::proxy("Node"))?)?
            .propx("parent", t::proxy("Node"))?
            .named("Node")
            .build()?;

        let mut reg = RelationshipRegistry::default();
        reg.manage(node)?;

        insta::assert_debug_snapshot!("self relationship", reg);

        Ok(())
    }

    #[test]
    fn test_ambiguous_side() -> Result<(), String> {
        Store::reset();
        let user = t::struct_()
            .propx("id", t::integer().as_id(true))?
            .propx("profile", t::proxy("Profile"))?
            .named("User")
            .build()?;

        let profile = t::struct_()
            .propx("id", t::integer().as_id(true))?
            .propx("user", t::proxy("User"))?
            .named("Profile")
            .build()?;

        let mut reg = RelationshipRegistry::default();
        let res = reg.manage(user);
        assert_eq!(
            res,
            Err(errors::ambiguous_side("Profile", "user", "User", "profile"))
        );
        let res = reg.manage(profile);
        assert_eq!(
            res,
            Err(errors::ambiguous_side("User", "profile", "Profile", "user"))
        );

        Store::reset();
        let user = t::struct_()
            .propx("id", t::integer().as_id(true))?
            .propx("profile", t::optionalx(t::proxy("Profile"))?)?
            .named("User")
            .build()?;

        let profile = t::struct_()
            .propx("id", t::integer().as_id(true))?
            .propx("user", t::optionalx(t::proxy("User"))?)?
            .named("Profile")
            .build()?;

        let mut reg = RelationshipRegistry::default();
        let res = reg.manage(user);
        assert_eq!(
            res,
            Err(errors::ambiguous_side("Profile", "user", "User", "profile"))
        );
        let res = reg.manage(profile);
        assert_eq!(
            res,
            Err(errors::ambiguous_side("User", "profile", "Profile", "user"))
        );

        Ok(())
    }

    #[test]
    fn test_conflicting_attributes() -> Result<(), String> {
        Store::reset();
        let user = t::struct_()
            .propx("id", t::integer().as_id(true))?
            .propx("profile", prisma_linkn("Profile").fkey(true))?
            .named("User")
            .build()?;

        let profile = t::struct_()
            .propx("id", t::integer().as_id(true))?
            .propx("user", prisma_linkn("User").fkey(true))?
            .named("Profile")
            .build()?;

        let mut reg = RelationshipRegistry::default();
        let res = reg.manage(user);
        assert_eq!(
            res,
            Err(errors::conflicting_attributes(
                "fkey", "Profile", "user", "User", "profile"
            ))
        );
        let res = reg.manage(profile);
        assert_eq!(
            res,
            Err(errors::conflicting_attributes(
                "fkey", "User", "profile", "Profile", "user"
            ))
        );

        Store::reset();
        let user = t::struct_()
            .propx("id", t::integer().as_id(true))?
            .propx("profile", prisma_linkn("Profile").fkey(false))?
            .named("User")
            .build()?;

        let profile = t::struct_()
            .propx("id", t::integer().as_id(true))?
            .propx("user", prisma_linkn("User").fkey(false))?
            .named("Profile")
            .build()?;

        let mut reg = RelationshipRegistry::default();
        let res = reg.manage(user);
        assert_eq!(
            res,
            Err(errors::conflicting_attributes(
                "fkey", "Profile", "user", "User", "profile"
            ))
        );
        let res = reg.manage(profile);
        assert_eq!(
            res,
            Err(errors::conflicting_attributes(
                "fkey", "User", "profile", "Profile", "user"
            ))
        );

        Ok(())
    }

    #[test]
    fn test_missing_target() -> Result<(), String> {
        Store::reset();
        let user = t::struct_()
            .propx("id", t::integer().as_id(true))?
            .propx("profile", prisma_linkn("Profile").fkey(true))?
            .named("User")
            .build()?;

        let _profile = t::struct_()
            .propx("id", t::integer().as_id(true))?
            .named("Profile")
            .build()?;

        let mut reg = RelationshipRegistry::default();
        let res = reg.manage(user);
        assert_eq!(
            res,
            Err(errors::no_relationship_target("User", "profile", "Profile"))
        );

        Ok(())
    }
}
