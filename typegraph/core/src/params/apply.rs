// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::{ErrorContext, Result, TgError};
use crate::t::{self, TypeBuilder};
use crate::types::{Type, TypeDef, TypeId};
use crate::wit::core::{ParameterTransform, TransformData};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt::Write;

pub mod raw_tree {
    use serde::Deserialize;
    use std::collections::HashMap;

    #[derive(Debug, Clone, Deserialize)]
    #[serde(tag = "source", rename_all = "lowercase")]
    pub enum ParameterTransformLeafNode {
        Arg {
            name: Option<String>,
            type_id: Option<u32>,
        },
        Static {
            value_json: String,
        },
        Secret {
            key: String,
        },
        Context {
            key: String,
            type_id: Option<u32>,
        },
        Parent {
            type_name: String,
        },
    }

    #[derive(Debug, Clone, Deserialize)]
    #[serde(tag = "type", rename_all = "lowercase")]
    pub enum ParameterTransformParentNode {
        Object {
            fields: HashMap<String, ParameterTransformNode>,
        },
        Array {
            items: Vec<ParameterTransformNode>,
        },
    }

    #[derive(Debug, Clone, Deserialize)]
    #[serde(untagged, rename_all = "lowercase")]
    pub enum ParameterTransformNode {
        Leaf(ParameterTransformLeafNode),
        Parent(ParameterTransformParentNode),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "source", rename_all = "lowercase")]
pub enum ParameterTransformLeafNode {
    Arg { name: String },
    Static { value_json: String },
    Secret { key: String },
    Context { key: String },
    Parent { type_name: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ParameterTransformParentNode {
    Object {
        fields: HashMap<String, ParameterTransformNode>,
    },
    Array {
        items: Vec<ParameterTransformNode>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ParameterTransformNodeData {
    Leaf(ParameterTransformLeafNode),
    Parent(ParameterTransformParentNode),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterTransformNode {
    pub type_id: u32,
    pub data: ParameterTransformNodeData,
}

struct QueryParam {
    path: Vec<String>,
    type_id: TypeId,
}

#[derive(Clone, Debug)]
enum PathSeg {
    Field(String),
    Index(usize),
}

impl ToString for PathSeg {
    fn to_string(&self) -> String {
        match self {
            PathSeg::Field(s) => s.clone(),
            PathSeg::Index(i) => format!("[{i}]"),
        }
    }
}

fn stringify_path(path: &[PathSeg]) -> Result<String> {
    let mut buf = String::new();
    if let Some(seg) = path.first() {
        match seg {
            PathSeg::Field(s) => write!(&mut buf, "{s}"),
            PathSeg::Index(i) => write!(&mut buf, "[{i}]"),
        }
        .map_err(|e| -> TgError { format!("Error while writing path segment: {e:?}").into() })?;

        for seg in path[1..].iter() {
            match seg {
                PathSeg::Field(s) => write!(&mut buf, ".{s}"),
                PathSeg::Index(i) => write!(&mut buf, ".[{i}]"),
            }
            .map_err(|e| -> TgError {
                format!("Error while writing path segment: {e:?}").into()
            })?;
        }
    }
    Ok(buf)
}

impl TryFrom<String> for PathSeg {
    type Error = crate::errors::TgError;

    fn try_from(s: String) -> Result<Self> {
        if s.starts_with('[') && s.ends_with(']') {
            if let Ok(index) = s[1..s.len() - 1].parse::<usize>() {
                Ok(PathSeg::Index(index))
            } else {
                Err("invalid index".into())
            }
        } else {
            Ok(PathSeg::Field(s))
        }
    }
}

pub fn build_transform_data(
    resolver_input: TypeId,
    root_fields: &HashMap<String, raw_tree::ParameterTransformNode>,
) -> Result<TransformData> {
    let mut context = TransformDataBuildContext::default();
    let (new_tree, type_id) = context.check_object_node(resolver_input, root_fields)?;

    let mut query_input_type = t::struct_();
    for (name, param) in context.query_params.into_iter() {
        query_input_type.prop(name, param.type_id);
    }

    Ok(TransformData {
        query_input: query_input_type.build()?.0,
        parameter_transform: ParameterTransform {
            resolver_input: type_id.0,
            transform_tree: serde_json::to_string(&new_tree)
                .map_err(|e| TgError::from(format!("Failed to serialize transform_root: {}", e)))?,
        },
    })
}

#[derive(Default)]
pub struct TransformDataBuildContext {
    query_params: HashMap<String, QueryParam>,
    path: Vec<PathSeg>,
}

impl TransformDataBuildContext {
    fn get_param_name(&self, provided: Option<&str>) -> Result<String> {
        if let Some(provided) = provided {
            Ok(provided.to_string())
        } else {
            let seg = self
                .path
                .last()
                .ok_or_else(|| TgError::from("Cannot get param name from empty path"))?;
            match seg {
                PathSeg::Field(name) => Ok(name.clone()),
                PathSeg::Index(_) => Err(format!(
                    "Cannot get param name from array item at {}. Please provide an explicit name",
                    stringify_path(&self.path).unwrap()
                )
                .into()),
            }
        }
    }

    fn check_leaf_node(
        &mut self,
        type_id: TypeId,
        leaf: &raw_tree::ParameterTransformLeafNode,
    ) -> Result<ParameterTransformNode> {
        use raw_tree::ParameterTransformLeafNode as N;
        match leaf {
            N::Arg {
                name,
                type_id: inp_type_id,
            } => {
                let type_id = inp_type_id.map(TypeId).unwrap_or(type_id);
                let param_name = self.get_param_name(name.as_deref())?;
                let old_param = self.query_params.insert(
                    param_name.clone(),
                    QueryParam {
                        path: self.path.iter().map(|seg| seg.to_string()).collect(),
                        type_id,
                    },
                );
                if let Some(param) = old_param {
                    let path1 = stringify_path(&self.path)?;
                    let path2 = param.path.join(".");
                    Err(
                        format!("Duplicate parameter {param_name:?} at {path1:?} and {path2:?}")
                            .into(),
                    )
                } else {
                    Ok(ParameterTransformNode {
                        type_id: type_id.0,
                        data: ParameterTransformNodeData::Leaf(ParameterTransformLeafNode::Arg {
                            name: param_name,
                        }),
                    })
                }
            }
            N::Static { value_json } => {
                // TODO validate value type
                Ok(ParameterTransformNode {
                    type_id: type_id.0,
                    data: ParameterTransformNodeData::Leaf(ParameterTransformLeafNode::Static {
                        value_json: value_json.clone(),
                    }),
                })
            }
            N::Secret { key } => Ok(ParameterTransformNode {
                type_id: type_id.0,
                data: ParameterTransformNodeData::Leaf(ParameterTransformLeafNode::Secret {
                    key: key.clone(),
                }),
            }),
            N::Context {
                key,
                type_id: inp_type_id,
            } => {
                let type_id = inp_type_id.map(TypeId).unwrap_or(type_id);
                Ok(ParameterTransformNode {
                    type_id: type_id.0,
                    data: ParameterTransformNodeData::Leaf(ParameterTransformLeafNode::Context {
                        key: key.clone(),
                    }),
                })
            }
            N::Parent { type_name } => Ok(ParameterTransformNode {
                type_id: type_id.0,
                data: ParameterTransformNodeData::Leaf(ParameterTransformLeafNode::Parent {
                    type_name: type_name.clone(),
                }),
            }),
        }
    }

    fn check_object_node(
        &mut self,
        type_id: TypeId,
        fields: &HashMap<String, raw_tree::ParameterTransformNode>,
    ) -> Result<(ParameterTransformNode, TypeId)> {
        let mut new_fields = HashMap::new();
        let type_id = type_id.resolve_optional()?;
        let ty = type_id.as_struct().with_context(|| {
            format!(
                "Expected a (optional) struct for an object node at {path:?}",
                path = stringify_path(&self.path).unwrap()
            )
        })?;
        let mut available_fields = ty
            .data
            .props
            .iter()
            .map(|(k, v)| (k.as_str(), *v))
            .collect::<HashMap<_, _>>();
        for (field, node) in fields {
            let prop_type_id = available_fields.remove(field.as_str()).ok_or_else(|| {
                format!(
                    "Field {field:?} not found in type {repr:?} at {path:?}",
                    field = field,
                    repr = type_id.repr().unwrap(),
                    path = stringify_path(&self.path).unwrap()
                )
            })?;

            self.path.push(PathSeg::Field(field.clone()));
            let extended_node = self.check_node(prop_type_id.into(), node)?;
            self.path.pop();
            new_fields.insert(field.clone(), extended_node);
        }

        let non_optional_fields = available_fields
            .iter()
            .filter_map(|(&k, &type_id)| {
                TypeId(type_id)
                    .as_type()
                    .map(|ty| {
                        if !matches!(ty, Type::Def(TypeDef::Optional(_))) {
                            Some(k)
                        } else {
                            None
                        }
                    })
                    .with_context(|| {
                        format!(
                            "Error while resolving type #{type_id} at the field {k:?} at {path:?}",
                            path = stringify_path(&self.path).unwrap()
                        )
                    })
                    .transpose()
            })
            .collect::<Result<Vec<_>>>()?;

        if !non_optional_fields.is_empty() {
            Err(format!(
                "Missing non-optional fields {non_optional_fields:?} at {path:?}",
                path = stringify_path(&self.path).unwrap()
            )
            .into())
        } else {
            let mut builder = t::struct_();
            let mut fields = HashMap::default();
            for (name, (node, type_id)) in new_fields.into_iter() {
                builder.prop(&name, type_id);
                fields.insert(name, node);
            }

            Ok((
                ParameterTransformNode {
                    type_id: type_id.0,
                    data: ParameterTransformNodeData::Parent(
                        ParameterTransformParentNode::Object { fields },
                    ),
                },
                builder.build()?,
            ))
        }
    }

    fn check_array_node(
        &mut self,
        type_id: TypeId,
        items: &[raw_tree::ParameterTransformNode],
    ) -> Result<ParameterTransformNode> {
        let mut new_items = vec![];
        let type_id = type_id.resolve_optional()?;
        let ty = type_id.as_list().with_context(|| {
            format!(
                "Expected a (optional) list for an array node at {path:?}",
                path = stringify_path(&self.path).unwrap()
            )
        })?;

        let item_type_id = TypeId(ty.data.of);

        for (index, node) in items.iter().enumerate() {
            self.path.push(PathSeg::Index(index));
            let extended_node = self.check_node(item_type_id, node)?.0;
            self.path.pop();
            new_items.push(extended_node);
        }
        Ok(ParameterTransformNode {
            type_id: type_id.0,
            data: ParameterTransformNodeData::Parent(ParameterTransformParentNode::Array {
                items: new_items,
            }),
        })
    }

    fn check_node(
        &mut self,
        type_id: TypeId,
        node: &raw_tree::ParameterTransformNode,
    ) -> Result<(ParameterTransformNode, TypeId)> {
        use raw_tree::ParameterTransformNode as N;
        use raw_tree::ParameterTransformParentNode as P;
        match node {
            N::Leaf(leaf) => Ok((self.check_leaf_node(type_id, leaf)?, type_id)),
            N::Parent(parent) => match parent {
                P::Object { fields } => self.check_object_node(type_id, fields),
                P::Array { items } => Ok((self.check_array_node(type_id, items)?, type_id)),
            },
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::test_utils::tree;
    use raw_tree::{
        ParameterTransformLeafNode, ParameterTransformNode, ParameterTransformParentNode,
    };

    #[test]
    fn identity() -> Result<()> {
        let input = t::struct_()
            .propx("a", t::string())?
            .propx("b", t::string())?
            .build()?;
        let root_fields = {
            let mut map = HashMap::new();
            map.insert(
                "a".to_string(),
                ParameterTransformNode::Leaf(ParameterTransformLeafNode::Arg {
                    name: None,
                    type_id: None,
                }),
            );
            map.insert(
                "b".to_string(),
                ParameterTransformNode::Leaf(ParameterTransformLeafNode::Arg {
                    name: None,
                    type_id: None,
                }),
            );
            map
        };

        let transform_data = build_transform_data(input, &root_fields)?;

        let print_options = tree::PrintOptions::new().no_indent_lines();
        assert_eq!(
            print_options.print(transform_data.query_input.into()),
            indoc::indoc! {"
                root: struct #4
                    [a]: string #0
                    [b]: string #1
            "}
        );
        Ok(())
    }

    #[test]
    fn identity_named() -> Result<()> {
        let input = t::struct_()
            .propx("a", t::string())?
            .propx("b", t::string())?
            .build()?;
        let root = vec![
            (
                "a".to_string(),
                ParameterTransformNode::Leaf(ParameterTransformLeafNode::Arg {
                    name: Some("first".to_string()),
                    type_id: None,
                }),
            ),
            (
                "b".to_string(),
                ParameterTransformNode::Leaf(ParameterTransformLeafNode::Arg {
                    name: Some("second".to_string()),
                    type_id: None,
                }),
            ),
        ]
        .into_iter()
        .collect();

        let transform_data = build_transform_data(input, &root)?;

        let print_options = tree::PrintOptions::new().no_indent_lines();
        assert_eq!(
            print_options.print(transform_data.query_input.into()),
            indoc::indoc! {"
                root: struct #4
                    [first]: string #0
                    [second]: string #1
            "}
        );
        Ok(())
    }

    #[test]
    fn array_items() -> Result<()> {
        let input = t::struct_()
            .propx("a", t::string())?
            .propx("b", t::listx(t::string())?)?
            .build()?;
        let root = vec![
            (
                "a".to_string(),
                ParameterTransformNode::Leaf(ParameterTransformLeafNode::Arg {
                    name: None,
                    type_id: None,
                }),
            ),
            (
                "b".to_string(),
                ParameterTransformNode::Parent(ParameterTransformParentNode::Array {
                    items: vec![
                        ParameterTransformNode::Leaf(ParameterTransformLeafNode::Arg {
                            name: None,
                            type_id: None,
                        }),
                        ParameterTransformNode::Leaf(ParameterTransformLeafNode::Arg {
                            name: None,
                            type_id: None,
                        }),
                    ],
                }),
            ),
        ]
        .into_iter()
        .collect();

        let transform_data = build_transform_data(input, &root);
        assert!(transform_data.is_err());
        let err = transform_data.unwrap_err().to_string();
        // eprintln!("{}", err);
        assert!(err.contains("Cannot get param name from array item at b.[0]"));

        let root = vec![
            (
                "a".to_string(),
                ParameterTransformNode::Leaf(ParameterTransformLeafNode::Arg {
                    name: None,
                    type_id: None,
                }),
            ),
            (
                "b".to_string(),
                ParameterTransformNode::Parent(ParameterTransformParentNode::Array {
                    items: vec![
                        ParameterTransformNode::Leaf(ParameterTransformLeafNode::Arg {
                            name: Some("first".to_string()),
                            type_id: None,
                        }),
                        ParameterTransformNode::Leaf(ParameterTransformLeafNode::Arg {
                            name: Some("second".to_string()),
                            type_id: None,
                        }),
                    ],
                }),
            ),
        ]
        .into_iter()
        .collect();

        let transform_data = build_transform_data(input, &root)?;
        let print_options = tree::PrintOptions::new().no_indent_lines();
        assert_eq!(
            print_options.print(transform_data.query_input.into()),
            indoc::indoc! {"
                root: struct #5
                    [a]: string #0
                    [first]: string #1
                    [second]: string #1
            "}
        );
        Ok(())
    }
}
