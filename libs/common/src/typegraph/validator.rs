// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

mod input;
mod types;
mod value;

use crate::typegraph::{TypeNode, Typegraph};
use serde_json::Value;

use super::{
    visitor::{CurrentNode, Path, PathSegment, TypeVisitor, TypeVisitorContext, VisitResult},
    EitherTypeData, Injection, UnionTypeData,
};

pub fn validate_typegraph(tg: &Typegraph) -> Vec<ValidatorError> {
    let context = ValidatorContext { typegraph: tg };
    let validator = Validator::default();
    tg.traverse_types(validator, &context).unwrap()
}

#[derive(Debug)]
pub struct ValidatorError {
    pub path: String,
    pub message: String,
}

#[derive(Debug)]
pub struct ValidatorContext<'a> {
    typegraph: &'a Typegraph,
}

#[derive(Debug, Default)]
struct Validator {
    errors: Vec<ValidatorError>,
}

impl Validator {
    fn push_error(&mut self, path: &[PathSegment], message: impl Into<String>) {
        self.errors.push(ValidatorError {
            path: Path(path).to_string(),
            message: message.into(),
        });
    }
}

impl Typegraph {
    fn collect_nested_variants_into(&self, out: &mut Vec<u32>, variants: &[u32]) {
        for idx in variants {
            let node = self.types.get(*idx as usize).unwrap();
            match node {
                TypeNode::Union {
                    data: UnionTypeData { any_of: variants },
                    ..
                }
                | TypeNode::Either {
                    data: EitherTypeData { one_of: variants },
                    ..
                } => self.collect_nested_variants_into(out, variants),
                _ => out.push(*idx),
            }
        }
    }
}

impl<'a> TypeVisitorContext for ValidatorContext<'a> {
    fn get_typegraph(&self) -> &Typegraph {
        self.typegraph
    }
}

impl<'a> TypeVisitor<'a> for Validator {
    type Return = Vec<ValidatorError>;
    type Context = ValidatorContext<'a>;

    fn visit(
        &mut self,
        current_node: CurrentNode<'_>,
        context: &Self::Context,
    ) -> VisitResult<Self::Return> {
        let typegraph = context.get_typegraph();
        let type_node = current_node.type_node;
        if current_node.as_input {
            // do not allow t.func in input types
            if let TypeNode::Function { .. } = type_node {
                self.push_error(current_node.path, "function is not allowed in input types");
                return VisitResult::Continue(false);
            }
        } else {
            match type_node {
                TypeNode::Union { .. } | TypeNode::Either { .. } => {
                    let mut variants = vec![];
                    typegraph.collect_nested_variants_into(&mut variants, &[current_node.type_idx]);
                    let mut object_count = 0;

                    for variant_type in variants
                        .iter()
                        .map(|idx| typegraph.types.get(*idx as usize).unwrap())
                    {
                        match variant_type {
                            TypeNode::Object { .. } => object_count += 1,
                            TypeNode::Boolean { .. }
                            | TypeNode::Float { .. }
                            | TypeNode::Integer { .. }
                            | TypeNode::String { .. } => {
                                // scalar
                            }
                            TypeNode::List { data, .. } => {
                                let item_type = typegraph.types.get(data.items as usize).unwrap();
                                if !item_type.is_scalar() {
                                    self.push_error(
                                        current_node.path,
                                        format!(
                                            "array of '{}' not allowed as union/either variant",
                                            item_type.type_name()
                                        ),
                                    );
                                    return VisitResult::Continue(false);
                                }
                            }
                            _ => {
                                self.push_error(
                                    current_node.path,
                                    format!(
                                        "type '{}' not allowed as union/either variant",
                                        variant_type.type_name()
                                    ),
                                );
                                return VisitResult::Continue(false);
                            }
                        }
                    }

                    if object_count != 0 && object_count != variants.len() {
                        self.push_error(
                            current_node.path,
                            "union variants must either be all scalars or all objects",
                        );
                        return VisitResult::Continue(false);
                    }
                }
                TypeNode::Function { .. } => {
                    // validate materializer??
                    // TODO deno static
                }
                _ => {}
            }
        }

        if let Some(enumeration) = &type_node.base().enumeration {
            if matches!(type_node, TypeNode::Optional { .. }) {
                self.push_error(
                    current_node.path,
                    "optional not cannot have enumerated values".to_owned(),
                );
            } else {
                for value in enumeration.iter() {
                    match serde_json::from_str::<Value>(value) {
                        Ok(val) => match context
                            .get_typegraph()
                            .validate_value(current_node.type_idx, &val)
                        {
                            Ok(_) => {}
                            Err(err) => self.push_error(current_node.path, err.to_string()),
                        },
                        Err(e) => self.push_error(
                            current_node.path,
                            format!("Error while deserializing enum value {value:?}: {e:?}"),
                        ),
                    }
                }
            }
        }

        if let Some(injection) = &type_node.base().injection {
            match injection {
                Injection::Static(data) => {
                    for value in data.values().iter() {
                        match serde_json::from_str::<Value>(value) {
                            Ok(val) => {
                                match typegraph.validate_value(current_node.type_idx, &val) {
                                    Ok(_) => {}
                                    Err(err) => self.push_error(current_node.path, err.to_string()),
                                }
                            }
                            Err(e) => {
                                self.push_error(
                                    current_node.path,
                                    format!(
                                        "Error while parsing static injection value {value:?}: {e:?}",
                                        value = value
                                    ),
                                );
                            }
                        }
                    }
                }
                Injection::Parent(_data) => {
                    // TODO match type to parent type
                }
                _ => (),
            }

            //
            VisitResult::Continue(false)
        } else {
            VisitResult::Continue(true)
        }
    }

    fn get_result(self) -> Option<Self::Return> {
        Some(self.errors)
    }
}
