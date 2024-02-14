// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

mod common;
mod input;
mod types;
mod value;

use crate::typegraph::{TypeNode, Typegraph};

use super::visitor::{
    CurrentNode, Path, PathSegment, TypeVisitor, TypeVisitorContext, VisitResult, VisitorResult,
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

#[derive(Debug, Clone)]
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
        let typegraph = context.get_typegraph();
        let type_node = current_node.type_node;

        match type_node {
            TypeNode::Union { .. } | TypeNode::Either { .. } => {
                let mut variants = vec![];
                typegraph.collect_nested_variants_into(&mut variants, &[current_node.type_idx]);
                match typegraph.check_union_variants(&variants) {
                    Ok(_) => {}
                    Err(err) => {
                        self.push_error(current_node.path, err);
                        return VisitResult::Continue(false);
                    }
                }
            }
            TypeNode::Function { .. } => {
                // validate materializer??
                // TODO deno static
            }
            _ => {}
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

        if type_node.base().injection.is_some() {
            self.push_error(
                current_node.path,
                "Injection is not allowed in output types".to_owned(),
            );
            return VisitResult::Continue(false);
        }

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
