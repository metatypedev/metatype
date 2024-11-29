// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{borrow::Cow, collections::HashMap};

use crate::interlude::*;
use common::typegraph::{
    visitor::{Edge, PathSegment},
    visitor2::{self, NearestFn, VisitNext},
    Typegraph,
};

#[derive(Debug)]
pub struct TypePath(pub Vec<Cow<'static, str>>);

fn serialize_path_segment(seg: &PathSegment) -> Result<Cow<'static, str>> {
    match &seg.edge {
        Edge::ObjectProp(key) => Ok(format!("TypePathSegment::ObjectProp({key:?})").into()),
        Edge::ArrayItem => Ok("TypePathSegment::ArrayItem".into()),
        Edge::OptionalItem => Ok("TypePathSegment::Optional".into()),
        Edge::UnionVariant(_) => bail!("file input is not supported in polymorphic types"),
        _ => bail!("unexpected path segment in input type: {:?}", seg),
    }
}

impl<'a> TryFrom<&'a [PathSegment]> for TypePath {
    type Error = anyhow::Error;

    fn try_from(tg_path: &'a [PathSegment]) -> Result<Self, Self::Error> {
        let mut path = Vec::with_capacity(tg_path.len());
        for seg in tg_path {
            path.push(serialize_path_segment(seg)?);
        }
        Ok(TypePath(path))
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
