// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;

use crate::errors::Result;
use crate::errors::TgError;
use crate::t;
use crate::t::TypeBuilder;
use crate::types::TypeId;
use crate::{params::apply::*, typegraph::TypegraphContext};
use tg_schema::parameter_transform as cm;

pub fn convert_tree(
    ctx: &mut TypegraphContext,
    root_fields: &ParameterTransformNode,
) -> Result<cm::ParameterTransformNode> {
    let res = convert_node(ctx, root_fields)?;
    if !matches!(
        res.data,
        cm::ParameterTransformNodeData::Parent(cm::ParameterTransformParentNode::Object { .. })
    ) {
        return Err(TgError::from("Root node must be an object node"));
    }
    Ok(res)
}

fn convert_node(
    ctx: &mut TypegraphContext,
    node: &ParameterTransformNode,
) -> Result<cm::ParameterTransformNode> {
    let type_idx = ctx.register_type(TypeId(node.type_id))?.0;
    match &node.data {
        ParameterTransformNodeData::Leaf(leaf_node) => {
            convert_leaf_node(ctx, leaf_node).map(|leaf_node| cm::ParameterTransformNode {
                type_idx,
                data: cm::ParameterTransformNodeData::Leaf(leaf_node),
            })
        }
        ParameterTransformNodeData::Parent(parent_node) => convert_parent_node(ctx, parent_node)
            .map(|parent_node| cm::ParameterTransformNode {
                type_idx,
                data: cm::ParameterTransformNodeData::Parent(parent_node),
            }),
    }
}

fn convert_leaf_node(
    ctx: &mut TypegraphContext,
    node: &ParameterTransformLeafNode,
) -> Result<cm::ParameterTransformLeafNode> {
    match node {
        ParameterTransformLeafNode::Arg { name } => {
            Ok(cm::ParameterTransformLeafNode::Arg { name: name.clone() })
        }
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
        ParameterTransformLeafNode::Parent { type_name } => {
            let type_ref = t::ref_(type_name, Default::default()).build()?;
            let parent_idx = ctx.register_type(type_ref)?.0;
            Ok(cm::ParameterTransformLeafNode::Parent { parent_idx })
        }
    }
}

fn convert_parent_node(
    ctx: &mut TypegraphContext,
    node: &ParameterTransformParentNode,
) -> Result<cm::ParameterTransformParentNode> {
    match node {
        ParameterTransformParentNode::Object { fields } => convert_object_node(ctx, fields),
        ParameterTransformParentNode::Array { items } => convert_array_node(ctx, items),
    }
}

fn convert_object_node(
    ctx: &mut TypegraphContext,
    fields: &HashMap<String, ParameterTransformNode>,
) -> Result<cm::ParameterTransformParentNode> {
    Ok(cm::ParameterTransformParentNode::Object {
        fields: fields
            .iter()
            .try_fold(HashMap::new(), |mut acc, (key, node)| {
                acc.insert(key.clone(), convert_node(ctx, node)?);
                Ok::<_, TgError>(acc)
            })?,
    })
}

fn convert_array_node(
    ctx: &mut TypegraphContext,
    items: &[ParameterTransformNode],
) -> Result<cm::ParameterTransformParentNode> {
    Ok(cm::ParameterTransformParentNode::Array {
        items: items
            .iter()
            .map(|e| convert_node(ctx, e))
            .collect::<Result<Vec<_>>>()?,
    })
}
