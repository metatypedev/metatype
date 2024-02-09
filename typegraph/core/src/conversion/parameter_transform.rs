// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::parameter_transform as cm;

use crate::params::apply::*;

impl From<ApplyFromArg> for cm::ApplyFromArg {
    fn from(a: ApplyFromArg) -> Self {
        cm::ApplyFromArg {
            name: a.name.unwrap(),
        }
    }
}

impl From<ApplyFromStatic> for cm::ApplyFromStatic {
    fn from(a: ApplyFromStatic) -> Self {
        cm::ApplyFromStatic {
            value_json: a.value_json,
        }
    }
}

impl From<ApplyFromSecret> for cm::ApplyFromSecret {
    fn from(a: ApplyFromSecret) -> Self {
        cm::ApplyFromSecret { key: a.key }
    }
}

impl From<ApplyFromContext> for cm::ApplyFromContext {
    fn from(a: ApplyFromContext) -> Self {
        cm::ApplyFromContext { key: a.key }
    }
}

impl From<ApplyFromParent> for cm::ApplyFromParent {
    fn from(a: ApplyFromParent) -> Self {
        cm::ApplyFromParent { name: a.name }
    }
}

impl From<ParameterTransformLeafNode> for cm::ParameterTransformLeafNode {
    fn from(a: ParameterTransformLeafNode) -> Self {
        match a {
            ParameterTransformLeafNode::Arg(a) => cm::ParameterTransformLeafNode::Arg(a.into()),
            ParameterTransformLeafNode::Static(a) => {
                cm::ParameterTransformLeafNode::Static(a.into())
            }
            ParameterTransformLeafNode::Secret(a) => {
                cm::ParameterTransformLeafNode::Secret(a.into())
            }
            ParameterTransformLeafNode::Context(a) => {
                cm::ParameterTransformLeafNode::Context(a.into())
            }
            ParameterTransformLeafNode::Parent(a) => {
                cm::ParameterTransformLeafNode::Parent(a.into())
            }
        }
    }
}

impl From<ParameterTransformObjectNode> for cm::ParameterTransformObjectNode {
    fn from(a: ParameterTransformObjectNode) -> Self {
        cm::ParameterTransformObjectNode {
            fields: a.fields.into_iter().map(|(k, v)| (k, v.into())).collect(),
        }
    }
}

impl From<ParameterTransformArrayNode> for cm::ParameterTransformArrayNode {
    fn from(a: ParameterTransformArrayNode) -> Self {
        cm::ParameterTransformArrayNode {
            items: a.items.into_iter().map(|v| v.into()).collect(),
        }
    }
}

impl From<ParameterTransformParentNode> for cm::ParameterTransformParentNode {
    fn from(a: ParameterTransformParentNode) -> Self {
        match a {
            ParameterTransformParentNode::Object(a) => {
                cm::ParameterTransformParentNode::Object(a.into())
            }
            ParameterTransformParentNode::Array(a) => {
                cm::ParameterTransformParentNode::Array(a.into())
            }
        }
    }
}

impl From<ParameterTransformNode> for cm::ParameterTransformNode {
    fn from(a: ParameterTransformNode) -> Self {
        match a {
            ParameterTransformNode::Leaf(a) => cm::ParameterTransformNode::Leaf(a.into()),
            ParameterTransformNode::Parent(a) => cm::ParameterTransformNode::Parent(a.into()),
        }
    }
}
