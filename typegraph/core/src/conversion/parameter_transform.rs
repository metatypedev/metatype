// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;

use crate::errors::Result;
use crate::errors::TgError;
use crate::t;
use crate::t::TypeBuilder;
use crate::{params::apply::*, typegraph::TypegraphContext};
use common::typegraph::parameter_transform as cm;

pub fn convert_tree(
    ctx: &mut TypegraphContext,
    root_fields: &HashMap<String, ParameterTransformNode>,
    runtime_id: u32,
) -> Result<HashMap<String, cm::ParameterTransformNode>> {
    let object_node = convert_object_node(ctx, root_fields, runtime_id)?;
    match object_node {
        cm::ParameterTransformParentNode::Object { fields } => Ok(fields),
        _ => unreachable!(),
    }
}

fn convert_node(
    ctx: &mut TypegraphContext,
    node: &ParameterTransformNode,
    runtime_id: u32,
) -> Result<cm::ParameterTransformNode> {
    match node {
        ParameterTransformNode::Leaf(leaf_node) => {
            convert_leaf_node(ctx, leaf_node, runtime_id).map(cm::ParameterTransformNode::Leaf)
        }
        ParameterTransformNode::Parent(a) => {
            convert_parent_node(ctx, a, runtime_id).map(cm::ParameterTransformNode::Parent)
        }
    }
}

fn convert_leaf_node(
    ctx: &mut TypegraphContext,
    node: &ParameterTransformLeafNode,
    runtime_id: u32,
) -> Result<cm::ParameterTransformLeafNode> {
    match node {
        ParameterTransformLeafNode::Arg { name } => Ok(cm::ParameterTransformLeafNode::Arg {
            name: name.clone().ok_or_else(|| {
                Into::<TgError>::into("argument must have a know name".to_string())
            })?,
        }),
        ParameterTransformLeafNode::Static { value_json } => {
            Ok(cm::ParameterTransformLeafNode::Static {
                value_json: value_json.clone(),
            })
        }
        ParameterTransformLeafNode::Secret { key } => {
            Ok(cm::ParameterTransformLeafNode::Secret { key: key.clone() })
        }
        ParameterTransformLeafNode::Context { key } => {
            Ok(cm::ParameterTransformLeafNode::Context { key: key.clone() })
        }
        ParameterTransformLeafNode::Parent { name } => {
            let type_ref = t::ref_(name).build()?;
            let (_, type_def) = type_ref.resolve_ref()?;
            let type_idx = ctx.register_type(type_def, Some(runtime_id))?.0;
            Ok(cm::ParameterTransformLeafNode::Parent { type_idx })
        }
    }
}

fn convert_parent_node(
    ctx: &mut TypegraphContext,
    node: &ParameterTransformParentNode,
    runtime_id: u32,
) -> Result<cm::ParameterTransformParentNode> {
    match node {
        ParameterTransformParentNode::Object { fields } => {
            convert_object_node(ctx, fields, runtime_id)
        }
        ParameterTransformParentNode::Array { items } => convert_array_node(ctx, items, runtime_id),
    }
}

fn convert_object_node(
    ctx: &mut TypegraphContext,
    fields: &HashMap<String, ParameterTransformNode>,
    runtime_id: u32,
) -> Result<cm::ParameterTransformParentNode> {
    Ok(cm::ParameterTransformParentNode::Object {
        fields: fields
            .iter()
            .try_fold(HashMap::new(), |mut acc, (key, node)| {
                acc.insert(key.clone(), convert_node(ctx, node, runtime_id)?);
                Ok::<_, TgError>(acc)
            })?,
    })
}

fn convert_array_node(
    ctx: &mut TypegraphContext,
    items: &[ParameterTransformNode],
    runtime_id: u32,
) -> Result<cm::ParameterTransformParentNode> {
    Ok(cm::ParameterTransformParentNode::Array {
        items: items
            .iter()
            .map(|e| convert_node(ctx, e, runtime_id))
            .collect::<Result<Vec<_>>>()?,
    })
}
