// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;
use std::collections::HashMap;
use typegraph::{
    conv::{PathSegment, RelativePath},
    visitor::{PathExt as _, VisitNext},
    TypeNodeExt as _,
};

#[derive(Debug)]
pub enum ObjectPathSegment {
    Prop(Arc<str>),
    Array,
    Optional,
}

impl TryFrom<&PathSegment> for ObjectPathSegment {
    type Error = anyhow::Error;

    fn try_from(value: &PathSegment) -> Result<Self, Self::Error> {
        match &value {
            PathSegment::ObjectProp(key) => Ok(ObjectPathSegment::Prop(key.clone())),
            PathSegment::ListItem => Ok(ObjectPathSegment::Array),
            PathSegment::OptionalItem => Ok(ObjectPathSegment::Optional),
            PathSegment::UnionVariant(_) => {
                bail!("file input is not supported in polymorphic types")
            }
        }
    }
}

impl ObjectPathSegment {
    pub fn serialize_rs(&self) -> String {
        match self {
            ObjectPathSegment::Prop(key) => format!("TypePathSegment::ObjectProp({key:?})"),
            ObjectPathSegment::Array => "TypePathSegment::ArrayItem".to_owned(),
            ObjectPathSegment::Optional => "TypePathSegment::Optional".to_owned(),
        }
    }

    pub fn serialize(&self) -> String {
        match self {
            ObjectPathSegment::Prop(key) => format!(".{key}"),
            ObjectPathSegment::Array => "[]".to_owned(),
            ObjectPathSegment::Optional => "?".to_owned(),
        }
    }
}

#[derive(Debug)]
pub struct TypePath(pub Vec<ObjectPathSegment>);

impl<'a> TryFrom<&'a [PathSegment]> for TypePath {
    type Error = anyhow::Error;

    fn try_from(tg_path: &'a [PathSegment]) -> Result<Self, Self::Error> {
        let mut path = Vec::with_capacity(tg_path.len());
        for seg in tg_path {
            path.push(ObjectPathSegment::try_from(seg)?);
        }
        Ok(TypePath(path))
    }
}

impl TypePath {
    pub fn serialize_rs(&self) -> String {
        format!(
            "&[{}]",
            self.0
                .iter()
                .map(|path| path.serialize_rs())
                .collect::<Vec<_>>()
                .join(", ")
        )
    }

    pub fn to_vec_str(&self) -> Vec<String> {
        self.0.iter().map(|path| path.serialize()).collect()
    }
}

impl TryFrom<&Vec<PathSegment>> for TypePath {
    type Error = anyhow::Error;

    fn try_from(tg_path: &Vec<PathSegment>) -> Result<Self, Self::Error> {
        let inner = tg_path
            .iter()
            .map(|seg| ObjectPathSegment::try_from(seg))
            .collect::<Result<Vec<_>>>()?;
        Ok(Self(inner))
    }
}

pub fn serialize_typepaths_json(typepaths: &[TypePath]) -> Option<String> {
    let paths = typepaths
        .iter()
        .map(|path| path.to_vec_str())
        .collect::<Vec<_>>();

    if paths.is_empty() {
        None
    } else {
        Some(serde_json::to_string(&paths).unwrap())
    }
}

pub fn get_path_to_files(root: &Type) -> Result<HashMap<u32, Vec<TypePath>>> {
    typegraph::visitor::traverse_types(
        root.clone(),
        RelativePath::root(),
        Default::default(),
        |n, acc| -> Result<VisitNext, anyhow::Error> {
            if n.path.is_cyclic()? {
                return Ok(VisitNext::Stop);
            }
            match &n.ty {
                Type::File(_) => {
                    if let RelativePath::Input(key) = &n.relative_path {
                        let fn_idx = key.owner.upgrade().unwrap().idx();
                        let entry = acc.entry(fn_idx).or_default();
                        entry.push((&key.path).try_into().unwrap());
                    }
                    Ok(VisitNext::Siblings)
                }
                _ => Ok(VisitNext::Children),
            }
        },
    )
}
