// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use serde_json::Value;

use crate::typegraph::{
    visitor::{CurrentNode, Path, PathSegment, TypeVisitor, TypeVisitorContext, VisitResult},
    Injection, TypeNode, Typegraph,
};

use super::types::{EnsureSubtypeOf, ErrorCollector, ExtendedTypeNode};

#[derive(Debug)]
pub struct InputValidationError {
    path: String, // param_path   != fn_path
    message: String,
}

pub struct InputValidationContext<'a> {
    typegraph: &'a Typegraph,
    fn_path: String,
    fn_idx: u32,
    parent_struct_idx: u32,
}

impl TypeVisitorContext for InputValidationContext<'_> {
    fn get_typegraph(&self) -> &Typegraph {
        self.typegraph
    }
}

pub struct InputValidator {
    errors: Vec<InputValidationError>,
}

impl InputValidator {
    fn push_error(&mut self, path: &[PathSegment], message: impl Into<String>) {
        self.errors.push(InputValidationError {
            path: Path(path).to_string(),
            message: message.into(),
        });
    }
}

impl<'a> TypeVisitor<'a> for InputValidator {
    type Return = Vec<InputValidationError>;
    type Context = InputValidationContext<'a>;

    fn visit(
        &mut self,
        current_node: CurrentNode<'_>,
        context: &Self::Context,
    ) -> VisitResult<Self::Return> {
        let type_node = current_node.type_node;

        if let TypeNode::Function { .. } = type_node {
            // TODO suggest to use composition-- when available
            self.push_error(current_node.path, "Function is not allowed in input types.");
            return VisitResult::Continue(false);
        }
        if let Some(injection) = &type_node.base().injection {
            self.validate_injection(injection, current_node, context);
        }

        return VisitResult::Continue(true);
    }
}

impl InputValidator {
    fn validate_injection(
        &mut self,
        injection: &Injection,
        current_node: CurrentNode<'_>,
        context: &InputValidationContext<'_>,
    ) {
        let typegraph = context.get_typegraph();

        match injection {
            Injection::Static(data) => {
                for value in data.values().iter() {
                    match serde_json::from_str::<Value>(value) {
                        Ok(val) => match typegraph.validate_value(current_node.type_idx, &val) {
                            Ok(_) => {}
                            Err(err) => self.push_error(current_node.path, err.to_string()),
                        },
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
    }

    fn validate_parent_injection(
        &mut self,
        source_idx: u32,
        current_node: CurrentNode<'_>,
        context: &InputValidationContext<'_>,
    ) {
        let typegraph = context.get_typegraph();
        let source = ExtendedTypeNode::new(typegraph, source_idx);
        let target = ExtendedTypeNode::new(typegraph, current_node.type_idx);
        let mut errors = ErrorCollector::default();
        source.ensure_subtype_of(&target, &typegraph, &mut errors);
    }
}
