// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::model::ModelType;
use crate::errors::Result;
use crate::t::TypeBuilder;
use crate::types::{RefAttr, Type, TypeId, TypeRef};
use serde::{Deserialize, Serialize};

pub mod discovery;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Cardinality {
    Optional,
    One,
    Many,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct RelationshipModel {
    pub wrapper_type: TypeId,
    pub cardinality: Cardinality,
    pub model_type: ModelType,
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

#[derive(Clone)]
pub enum PrismaLinkTarget {
    Direct(Type),
    #[allow(unused)]
    Indirect(String),
}

#[derive(Clone)]
pub struct PrismaLink {
    target: PrismaLinkTarget,
    rel_name: Option<String>,
    fkey: Option<bool>,
    target_field: Option<String>,
    unique: bool,
}

impl PrismaLink {
    pub fn with_target(target: PrismaLinkTarget) -> Self {
        Self {
            target,
            rel_name: None,
            fkey: None,
            target_field: None,
            unique: false,
        }
    }
}

#[derive(Default, Debug, Serialize, Deserialize)]
pub struct PrismaRefData {
    pub rel_name: Option<String>,
    pub fkey: Option<bool>,
    pub target_field: Option<String>,
}

impl From<&PrismaLink> for PrismaRefData {
    fn from(link: &PrismaLink) -> Self {
        PrismaRefData {
            rel_name: link.rel_name.clone(),
            fkey: link.fkey,
            target_field: link.target_field.clone(),
        }
    }
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

    fn build_link(&self) -> Result<TypeId> {
        let attr = RefAttr::runtime(
            "prisma",
            serde_json::to_value(PrismaRefData::from(self)).unwrap(),
        );
        match &self.target {
            PrismaLinkTarget::Direct(t) => TypeRef::from_type(t.clone(), attr),
            PrismaLinkTarget::Indirect(n) => TypeRef::indirect(n, Some(attr)),
        }
        .register()
        .map(|t| t.id())
    }
}

impl TypeBuilder for PrismaLink {
    fn build(&self) -> Result<TypeId> {
        self.build_link()
    }
}

#[allow(dead_code)]
pub fn prisma_linkx(typ: impl TypeBuilder) -> Result<PrismaLink> {
    prisma_link(typ.build()?)
}

pub fn prisma_link(type_id: TypeId) -> Result<PrismaLink> {
    Ok(PrismaLink::with_target(PrismaLinkTarget::Direct(
        type_id.as_type()?,
    )))
}

#[allow(dead_code)]
pub fn prisma_linkn(name: impl Into<String>) -> PrismaLink {
    PrismaLink::with_target(PrismaLinkTarget::Indirect(name.into()))
}

#[cfg(test)]
mod test {
    use super::{prisma_linkn, prisma_linkx};
    use crate::errors::Result;
    use crate::global_store::Store;
    use crate::runtimes::prisma::context::PrismaContext;
    use crate::runtimes::prisma::errors;
    use crate::t::{self, TypeBuilder};
    use crate::test_utils::*;

    #[test]
    fn test_implicit_relationships() -> Result<()> {
        let (user, _post) = models::simple_relationship()?;

        let mut ctx = PrismaContext::default();
        ctx.manage(user)?;

        assert_eq!(ctx.relationships.len(), 1);
        let (name, rel) = ctx.relationships.iter().next().unwrap();
        assert_eq!(name, "rel_Post_User");
        assert_eq!(rel.left.model_type.name().as_ref(), "User");
        assert_eq!(rel.right.model_type.name().as_ref(), "Post");

        Ok(())
    }

    #[test]
    fn test_explicit_relationship_name() -> Result<()> {
        Store::reset();
        let user = t::struct_()
            .propx("id", t::integer().as_id())?
            .propx("name", t::string())?
            .propx("posts", t::listx(t::ref_("Post", Default::default()))?)?
            .build_named("User")?;

        let post = t::struct_()
            .propx("id", t::integer().as_id())?
            .propx("title", t::string())?
            .propx("author", prisma_linkn("User").name("PostAuthor"))?
            .build_named("Post")?;

        let mut ctx = PrismaContext::default();
        ctx.manage(user)?;
        ctx.manage(post)?;

        let relationships = ctx.relationships;
        assert_eq!(relationships.len(), 1);
        let (name, rel) = relationships.iter().next().unwrap();
        assert_eq!(name, "PostAuthor");
        assert_eq!(rel.left.model_type.name().as_ref(), "User");
        assert_eq!(rel.right.model_type.name().as_ref(), "Post");

        Ok(())
    }

    #[test]
    fn test_fkey_attribute() -> Result<()> {
        Store::reset();
        let user = t::struct_()
            .propx("id", t::integer().as_id())?
            .propx(
                "profile",
                prisma_linkx(t::optionalx(t::ref_("Profile", Default::default()))?)?.fkey(true),
            )?
            .build_named("User")?;

        let profile = t::struct_()
            .propx("id", t::integer().as_id())?
            .propx("user", t::optionalx(t::ref_("User", Default::default()))?)?
            .build_named("Profile")?;

        let mut ctx = PrismaContext::default();
        ctx.manage(user)?;
        ctx.manage(profile)?;

        let relationships = ctx.relationships;
        assert_eq!(relationships.len(), 1);
        let (name, rel) = relationships.iter().next().unwrap();
        assert_eq!(name, "rel_User_Profile");
        assert_eq!(rel.left.model_type.name().as_ref(), "Profile");
        assert_eq!(rel.right.model_type.name().as_ref(), "User");

        Ok(())
    }

    #[test]
    fn test_unique_attribute() -> Result<()> {
        Store::reset();
        let user = t::struct_()
            .propx("id", t::integer().as_id())?
            .propx(
                "profile",
                t::optionalx(t::ref_("Profile", Default::default()))?.config("unique", true),
            )?
            .build_named("User")?;

        let profile = t::struct_()
            .propx("id", t::integer().as_id())?
            .propx("user", t::optionalx(t::ref_("User", Default::default()))?)?
            .build_named("Profile")?;

        let mut ctx = PrismaContext::default();
        ctx.manage(user)?;
        ctx.manage(profile)?;

        assert_eq!(ctx.relationships.len(), 1);
        let (name, rel) = ctx.relationships.iter().next().unwrap();
        assert_eq!(name, "rel_User_Profile");
        assert_eq!(rel.left.model_type.name().as_ref(), "Profile");
        assert_eq!(rel.right.model_type.name().as_ref(), "User");

        Ok(())
    }

    #[test]
    fn test_self_relationship() -> Result<()> {
        Store::reset();
        let node = t::struct_()
            .propx("id", t::string().as_id())?
            .propx("children", t::listx(t::ref_("Node", Default::default()))?)?
            .propx("parent", t::ref_("Node", Default::default()))?
            .build_named("Node")?;

        let mut ctx = PrismaContext::default();
        ctx.manage(node)?;

        assert_eq!(ctx.relationships.len(), 1);
        let (name, rel) = ctx.relationships.iter().next().unwrap();
        assert_eq!(name, "rel_Node_Node");
        assert_eq!(rel.left.model_type.name().as_ref(), "Node");
        assert_eq!(rel.right.model_type.name().as_ref(), "Node");

        Ok(())
    }

    #[test]
    fn test_ambiguous_side() -> Result<()> {
        Store::reset();
        let user = t::struct_()
            .propx("id", t::integer().as_id())?
            .propx("profile", t::ref_("Profile", Default::default()))?
            .build_named("User")?;

        let profile = t::struct_()
            .propx("id", t::integer().as_id())?
            .propx("user", t::ref_("User", Default::default()))?
            .build_named("Profile")?;

        let mut ctx = PrismaContext::default();
        let res = ctx.manage(user);
        assert_eq!(
            res,
            Err(errors::ambiguous_side("Profile", "user", "User", "profile"))
        );
        let res = ctx.manage(profile);
        assert_eq!(
            res,
            Err(errors::ambiguous_side("User", "profile", "Profile", "user"))
        );

        Store::reset();
        let user = t::struct_()
            .propx("id", t::integer().as_id())?
            .propx(
                "profile",
                t::optionalx(t::ref_("Profile", Default::default()))?,
            )?
            .build_named("User")?;

        let profile = t::struct_()
            .propx("id", t::integer().as_id())?
            .propx("user", t::optionalx(t::ref_("User", Default::default()))?)?
            .build_named("Profile")?;

        let mut ctx = PrismaContext::default();
        let res = ctx.manage(user);
        assert_eq!(
            res,
            Err(errors::ambiguous_side("Profile", "user", "User", "profile"))
        );
        let res = ctx.manage(profile);
        assert_eq!(
            res,
            Err(errors::ambiguous_side("User", "profile", "Profile", "user"))
        );

        Ok(())
    }

    #[test]
    fn test_conflicting_attributes() -> Result<()> {
        Store::reset();
        let user = t::struct_()
            .propx("id", t::integer().as_id())?
            .propx("profile", prisma_linkn("Profile").fkey(true))?
            .build_named("User")?;

        let profile = t::struct_()
            .propx("id", t::integer().as_id())?
            .propx("user", prisma_linkn("User").fkey(true))?
            .build_named("Profile")?;

        let mut ctx = PrismaContext::default();
        let res = ctx.manage(user);
        assert_eq!(
            res,
            Err(errors::conflicting_attributes(
                "fkey", "Profile", "user", "User", "profile"
            ))
        );
        let res = ctx.manage(profile);
        assert_eq!(
            res,
            Err(errors::conflicting_attributes(
                "fkey", "User", "profile", "Profile", "user"
            ))
        );

        Store::reset();
        let user = t::struct_()
            .propx("id", t::integer().as_id())?
            .propx("profile", prisma_linkn("Profile").fkey(false))?
            .build_named("User")?;

        let profile = t::struct_()
            .propx("id", t::integer().as_id())?
            .propx("user", prisma_linkn("User").fkey(false))?
            .build_named("Profile")?;

        let mut ctx = PrismaContext::default();
        let res = ctx.manage(user);
        assert_eq!(
            res,
            Err(errors::conflicting_attributes(
                "fkey", "Profile", "user", "User", "profile"
            ))
        );
        let res = ctx.manage(profile);
        assert_eq!(
            res,
            Err(errors::conflicting_attributes(
                "fkey", "User", "profile", "Profile", "user"
            ))
        );

        Ok(())
    }

    #[test]
    fn test_missing_target() -> Result<()> {
        Store::reset();
        let user = t::struct_()
            .propx("id", t::integer().as_id())?
            .propx("profile", prisma_linkn("Profile").fkey(true))?
            .build_named("User")?;

        let _profile = t::struct_()
            .propx("id", t::integer().as_id())?
            .build_named("Profile")?;

        let mut ctx = PrismaContext::default();
        let res = ctx.manage(user);
        assert_eq!(
            res,
            Err(errors::no_relationship_target("User", "profile", "Profile"))
        );

        Ok(())
    }
}
