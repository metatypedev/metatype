// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::{ErrorContext, Result, TgError};
use crate::t::{self, TypeBuilder};
use crate::types::{Type, TypeDef, TypeId};
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Debug, Clone, Deserialize)]
pub struct ApplyFromArg {
    pub name: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Deserialize)]
pub struct ApplyFromStatic {
    pub value_json: String,
}

// TODO add to secret list??
#[allow(dead_code)]
#[derive(Debug, Clone, Deserialize)]
pub struct ApplyFromSecret {
    pub key: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Deserialize)]
pub struct ApplyFromContext {
    pub key: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Deserialize)]
pub struct ApplyFromParent {
    pub name: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "source")]
pub enum ParameterTransformLeafNode {
    Arg(ApplyFromArg),
    Static(ApplyFromStatic),
    Secret(ApplyFromSecret),
    Context(ApplyFromContext),
    Parent(ApplyFromParent),
}

#[derive(Debug, Clone, Deserialize)]
pub struct ParameterTransformObjectNode {
    pub fields: HashMap<String, ParameterTransformNode>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ParameterTransformArrayNode {
    pub items: Vec<ParameterTransformNode>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type")]
pub enum ParameterTransformParentNode {
    Object(ParameterTransformObjectNode),
    Array(ParameterTransformArrayNode),
}

#[derive(Debug, Clone, Deserialize)]
pub enum ParameterTransformNode {
    Leaf(ParameterTransformLeafNode),
    Parent(ParameterTransformParentNode),
}

struct QueryParam {
    path: Vec<String>,
    type_id: TypeId,
}

pub struct ParameterTransformValidator {
    query_params: HashMap<String, QueryParam>,
}

enum PathSeg {
    Field(String),
    Index(usize),
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

impl ParameterTransformValidator {
    pub fn new() -> Self {
        Self {
            query_params: HashMap::new(),
        }
    }

    fn get_param_name(provided: Option<&str>, path: &[String]) -> Result<String> {
        if let Some(provided) = provided {
            Ok(provided.to_string())
        } else {
            let name = path
                .last()
                .ok_or_else(|| TgError::from("Cannot get param name from empty path"))?;
            let seg = PathSeg::try_from(name.clone()).with_context(|| {
                format!(
                    "Could not get path segment from {name:?} at {}",
                    path.join(".")
                )
            })?;
            match seg {
                PathSeg::Field(name) => Ok(name),
                PathSeg::Index(_) => Err(format!(
                    "Cannot get param name from array item at {}. Please provide an explicit name",
                    path.join(".")
                )
                .into()),
            }
        }
    }

    // get query input type
    pub fn query_input(
        mut self,
        resolver_input: TypeId,
        root: ParameterTransformObjectNode,
    ) -> Result<TypeId> {
        self.check_object_node(resolver_input, &root, vec![])?;

        let mut query_input_type = t::struct_();
        for (name, param) in self.query_params.into_iter() {
            query_input_type.prop(name, param.type_id);
        }

        query_input_type.build()
    }

    fn check_leaf_node(
        &mut self,
        type_id: TypeId,
        leaf: &ParameterTransformLeafNode,
        path: Vec<String>,
    ) -> Result<()> {
        match leaf {
            ParameterTransformLeafNode::Arg(arg) => {
                let param_name = Self::get_param_name(arg.name.as_deref(), &path)?;
                let old_param = self.query_params.insert(
                    param_name.clone(),
                    QueryParam {
                        path: path.clone(),
                        type_id,
                    },
                );
                if let Some(param) = old_param {
                    let path1 = path.join(".");
                    let path2 = param.path.join(".");
                    Err(
                        format!("Duplicate parameter {param_name:?} at {path1:?} and {path2:?}")
                            .into(),
                    )
                } else {
                    Ok(())
                }
            }
            ParameterTransformLeafNode::Static(_) => Ok(()), // TODO validate agains type
            ParameterTransformLeafNode::Secret(_) => Ok(()),
            ParameterTransformLeafNode::Context(_) => Ok(()),
            ParameterTransformLeafNode::Parent(_) => Ok(()),
        }
    }

    fn check_object_node(
        &mut self,
        type_id: TypeId,
        node: &ParameterTransformObjectNode,
        path: Vec<String>,
    ) -> Result<()> {
        let type_id = type_id.resolve_optional()?;
        let ty = type_id.as_struct().with_context(|| {
            format!(
                "Expected a (optional) struct for an object node at {path:?}",
                path = path.join(".")
            )
        })?;
        let mut available_fields = ty
            .data
            .props
            .iter()
            .map(|(k, v)| (k.as_str(), *v))
            .collect::<HashMap<_, _>>();
        for (field, node) in &node.fields {
            let prop_type_id = available_fields.remove(field.as_str()).ok_or_else(|| {
                format!(
                    "Field {field:?} not found in type {repr:?} at {path:?}",
                    field = field,
                    repr = type_id.repr().unwrap(),
                    path = path.join("."),
                )
            })?;

            let mut path = path.clone();
            path.push(field.clone());
            self.check_node(prop_type_id.into(), node, path)?;
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
                            path = path.join(".")
                        )
                    })
                    .transpose()
            })
            .collect::<Result<Vec<_>>>()?;

        if !non_optional_fields.is_empty() {
            Err(format!(
                "Missing non-optional fields {non_optional_fields:?} at {path:?}",
                path = path.join(".")
            )
            .into())
        } else {
            Ok(())
        }
    }

    fn check_array_node(
        &mut self,
        type_id: TypeId,
        node: &ParameterTransformArrayNode,
        path: Vec<String>,
    ) -> Result<()> {
        let type_id = type_id.resolve_optional()?;
        let ty = type_id.as_list().with_context(|| {
            format!(
                "Expected a (optional) list for an array node at {path:?}",
                path = path.join(".")
            )
        })?;

        let item_type_id = TypeId(ty.data.of);

        for (index, node) in node.items.iter().enumerate() {
            let mut path = path.clone();
            path.push(format!("[{index}]"));
            self.check_node(item_type_id, node, path)?;
        }
        Ok(())
    }

    fn check_node(
        &mut self,
        type_id: TypeId,
        node: &ParameterTransformNode,
        path: Vec<String>,
    ) -> Result<()> {
        match node {
            ParameterTransformNode::Leaf(leaf) => self.check_leaf_node(type_id, leaf, path),
            ParameterTransformNode::Parent(parent) => match parent {
                ParameterTransformParentNode::Object(obj) => {
                    self.check_object_node(type_id, obj, path)
                }
                ParameterTransformParentNode::Array(arr) => {
                    self.check_array_node(type_id, arr, path)
                }
            },
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::test_utils::tree;

    #[test]
    fn identity() -> Result<()> {
        let validator = ParameterTransformValidator::new();
        let input = t::struct_()
            .propx("a", t::string())?
            .propx("b", t::string())?
            .build()?;
        let root = ParameterTransformObjectNode {
            fields: vec![
                (
                    "a".to_string(),
                    ParameterTransformNode::Leaf(ParameterTransformLeafNode::Arg(ApplyFromArg {
                        name: None,
                    })),
                ),
                (
                    "b".to_string(),
                    ParameterTransformNode::Leaf(ParameterTransformLeafNode::Arg(ApplyFromArg {
                        name: None,
                    })),
                ),
            ]
            .into_iter()
            .collect(),
        };
        let query_input = validator.query_input(input, root)?;

        let print_options = tree::PrintOptions::new().no_indent_lines();
        assert_eq!(
            print_options.print(query_input),
            indoc::indoc! {"
                root: struct #3
                    [a]: string #0
                    [b]: string #1
            "}
        );
        Ok(())
    }

    #[test]
    fn identity_named() -> Result<()> {
        let validator = ParameterTransformValidator::new();
        let input = t::struct_()
            .propx("a", t::string())?
            .propx("b", t::string())?
            .build()?;
        let root = ParameterTransformObjectNode {
            fields: vec![
                (
                    "a".to_string(),
                    ParameterTransformNode::Leaf(ParameterTransformLeafNode::Arg(ApplyFromArg {
                        name: Some("first".to_string()),
                    })),
                ),
                (
                    "b".to_string(),
                    ParameterTransformNode::Leaf(ParameterTransformLeafNode::Arg(ApplyFromArg {
                        name: Some("second".to_string()),
                    })),
                ),
            ]
            .into_iter()
            .collect(),
        };

        let query_input = validator.query_input(input, root)?;

        let print_options = tree::PrintOptions::new().no_indent_lines();
        assert_eq!(
            print_options.print(query_input),
            indoc::indoc! {"
                root: struct #3
                    [first]: string #0
                    [second]: string #1
            "}
        );
        Ok(())
    }

    #[test]
    fn array_items() -> Result<()> {
        let validator = ParameterTransformValidator::new();
        let input = t::struct_()
            .propx("a", t::string())?
            .propx("b", t::listx(t::string())?)?
            .build()?;
        let root = ParameterTransformObjectNode {
            fields: vec![
                (
                    "a".to_string(),
                    ParameterTransformNode::Leaf(ParameterTransformLeafNode::Arg(ApplyFromArg {
                        name: None,
                    })),
                ),
                (
                    "b".to_string(),
                    ParameterTransformNode::Parent(ParameterTransformParentNode::Array(
                        ParameterTransformArrayNode {
                            items: vec![
                                ParameterTransformNode::Leaf(ParameterTransformLeafNode::Arg(
                                    ApplyFromArg { name: None },
                                )),
                                ParameterTransformNode::Leaf(ParameterTransformLeafNode::Arg(
                                    ApplyFromArg { name: None },
                                )),
                            ],
                        },
                    )),
                ),
            ]
            .into_iter()
            .collect(),
        };

        let query_input = validator.query_input(input, root);
        assert!(query_input.is_err());
        let err = query_input.unwrap_err().to_string();
        // eprintln!("{}", err);
        assert!(err.contains("Cannot get param name from array item at b.[0]"));

        let root = ParameterTransformObjectNode {
            fields: vec![
                (
                    "a".to_string(),
                    ParameterTransformNode::Leaf(ParameterTransformLeafNode::Arg(ApplyFromArg {
                        name: None,
                    })),
                ),
                (
                    "b".to_string(),
                    ParameterTransformNode::Parent(ParameterTransformParentNode::Array(
                        ParameterTransformArrayNode {
                            items: vec![
                                ParameterTransformNode::Leaf(ParameterTransformLeafNode::Arg(
                                    ApplyFromArg {
                                        name: Some("first".to_string()),
                                    },
                                )),
                                ParameterTransformNode::Leaf(ParameterTransformLeafNode::Arg(
                                    ApplyFromArg {
                                        name: Some("second".to_string()),
                                    },
                                )),
                            ],
                        },
                    )),
                ),
            ]
            .into_iter()
            .collect(),
        };
        let query_input = ParameterTransformValidator::new().query_input(input, root)?;

        let print_options = tree::PrintOptions::new().no_indent_lines();
        assert_eq!(
            print_options.print(query_input),
            indoc::indoc! {"
                root: struct #4
                    [a]: string #0
                    [first]: string #1
                    [second]: string #1
            "}
        );
        Ok(())
    }
}
