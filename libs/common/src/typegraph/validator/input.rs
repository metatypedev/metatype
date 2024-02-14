// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use serde_json::Value;

use crate::typegraph::{
    visitor::{CurrentNode, TypeVisitor, VisitResult},
    Injection, TypeNode,
};

use super::{
    types::{EnsureSubtypeOf, ErrorCollector, ExtendedTypeNode},
    TypeVisitorContext, Validator, ValidatorContext,
};

impl Validator {
    pub fn visit_input_type_impl(
        &mut self,
        current_node: CurrentNode<'_>,
        context: &<Validator as TypeVisitor>::Context,
    ) -> VisitResult<<Validator as TypeVisitor>::Return> {
        let typegraph = context.get_typegraph();
        let type_node = current_node.type_node;

        match type_node {
            TypeNode::Function { .. } => {
                // TODO suggest to use composition-- when available
                self.push_error(current_node.path, "Function is not allowed in input types.");
                return VisitResult::Continue(false);
            }
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
            _ => (),
        }

        if let Some(injection) = &type_node.base().injection {
            self.validate_injection(injection, current_node, context);
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

        VisitResult::Continue(true)
    }
}

impl Validator {
    fn validate_injection(
        &mut self,
        injection: &Injection,
        current_node: CurrentNode<'_>,
        context: &ValidatorContext<'_>,
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
            Injection::Parent(data) => {
                let sources = data.values();
                for source_idx in sources.iter().copied() {
                    self.validate_parent_injection(*source_idx, &current_node, context);
                }
            }
            _ => (),
        }
    }

    fn validate_parent_injection(
        &mut self,
        source_idx: u32,
        current_node: &CurrentNode<'_>,
        context: &ValidatorContext<'_>,
    ) {
        let typegraph = context.get_typegraph();
        let source = ExtendedTypeNode::new(typegraph, source_idx);
        let target = ExtendedTypeNode::new(typegraph, current_node.type_idx);
        let mut errors = ErrorCollector::default();
        source.ensure_subtype_of(&target, typegraph, &mut errors);
        for error in errors.errors.into_iter() {
            self.push_error(
                current_node.path,
                format!("from_parent injection: {error}", error = error),
            );
        }
    }
}
