// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

mod common;
mod input;
mod types;
mod value;

use crate::typegraph::{TypeNode, Typegraph};

use super::visitor::{
    visit_child, ChildNode, CurrentNode, Edge, Path, PathSegment, TypeVisitor, TypeVisitorContext,
    VisitLayer, VisitResult, VisitorResult,
};

pub fn validate_typegraph(tg: &Typegraph) -> Vec<ValidatorError> {
    let context = ValidatorContext { typegraph: tg };
    let validator = Validator::default();
    tg.traverse_types(validator, &context, Layer, 0).unwrap()
}

#[derive(Debug)]
pub struct ValidatorError {
    pub path: String,
    pub message: String,
}

#[derive(Debug, Clone)]
pub struct ValidatorContext<'a> {
    typegraph: &'a Typegraph,
}

#[derive(Debug, Default)]
struct Validator {
    errors: Vec<ValidatorError>,
}

#[derive(Clone)]
struct Layer;

impl<'a> VisitLayer<'a, Validator> for Layer {
    fn visit(
        &self,
        traversal: &mut super::visitor::TypegraphTraversal<'a, Validator, Self>,
        source: impl Iterator<Item = ChildNode<'a>>,
        context: &'a ValidatorContext<'a>,
    ) -> Option<<Validator as TypeVisitor>::Return> {
        let mut errors = vec![];
        for ChildNode(path_seg, idx) in source {
            if let Some(err) = visit_child(traversal, path_seg, idx, context) {
                errors.extend(err);
            }
        }
        if errors.is_empty() {
            None
        } else {
            Some(errors)
        }
    }
}

impl Validator {
    fn push_error(&mut self, path: &[PathSegment], message: impl Into<String>) {
        self.errors.push(ValidatorError {
            path: Path(path).to_string(),
            message: message.into(),
        });
    }
}

impl VisitorResult for Vec<ValidatorError> {
    fn from_error(path: String, message: String) -> Self {
        vec![ValidatorError { path, message }]
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
        let type_node = current_node.type_node;

        let last_seg = current_node.path.last();
        if let Some(last_seg) = last_seg {
            if let Edge::FunctionInput = last_seg.edge {
                self.visit_input_type(current_node, context);
                return VisitResult::Continue(false);
            }
        }

        if let TypeNode::Function { .. } = type_node {
            // validate materializer??
            // TODO deno static
        }

        if let Some(enumeration) = &type_node.base().enumeration {
            match context
                .get_typegraph()
                .check_enum_values(current_node.type_idx, enumeration)
            {
                Ok(_) => {}
                Err(err) => {
                    for e in err {
                        self.push_error(current_node.path, e);
                    }
                }
            }
        }

        // FIXME: does not work for deno.identity()
        // if type_node.base().injection.is_some() {
        //     self.push_error(
        //         current_node.path,
        //         "Injection is not allowed in output types".to_owned(),
        //     );
        //     return VisitResult::Continue(false);
        // }

        VisitResult::Continue(true)
    }

    fn visit_input_type(
        &mut self,
        current_node: CurrentNode<'_>,
        context: &Self::Context,
    ) -> VisitResult<Self::Return> {
        self.visit_input_type_impl(current_node, context)
    }

    fn take_result(&mut self) -> Option<Self::Return> {
        Some(std::mem::take(&mut self.errors))
    }
}
