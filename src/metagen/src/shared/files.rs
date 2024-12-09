// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;

use crate::interlude::*;
use common::typegraph::{
    visitor::{Edge, PathSegment},
    visitor2::{self, NearestFn, VisitNext},
    Typegraph,
};

#[derive(Debug)]
pub enum ObjectPathSegment {
    Prop(String),
    Array,
    Optional,
}

impl TryFrom<&PathSegment> for ObjectPathSegment {
    type Error = anyhow::Error;

    fn try_from(value: &PathSegment) -> Result<Self, Self::Error> {
        match &value.edge {
            Edge::ObjectProp(key) => Ok(ObjectPathSegment::Prop(key.to_owned())),
            Edge::ArrayItem => Ok(ObjectPathSegment::Array),
            Edge::OptionalItem => Ok(ObjectPathSegment::Optional),
            Edge::UnionVariant(_) => bail!("file input is not supported in polymorphic types"),
            _ => bail!("unexpected path segment in input type: {:?}", value),
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

pub fn get_path_to_files(tg: &Typegraph, root: u32) -> Result<HashMap<u32, Vec<TypePath>>> {
    visitor2::traverse_types(
        tg,
        root,
        Default::default(),
        |cx, acc| -> Result<VisitNext, anyhow::Error> {
            match cx.current_node.type_node {
                TypeNode::File { .. } => {
                    let nearest_fn = cx.current_node.nearest_function();
                    if let Some(NearestFn {
                        path_index,
                        type_idx: fn_idx,
                        is_input,
                    }) = nearest_fn
                    {
                        if is_input {
                            let entry = acc.entry(fn_idx).or_default();
                            let current_path = cx.current_node.path.borrow();
                            entry.push(TypePath::try_from(&current_path[(path_index + 1)..])?);
                        }
                    }
                    Ok(visitor2::VisitNext::Siblings)
                }
                _ => Ok(visitor2::VisitNext::Children),
            }
        },
    )
}
