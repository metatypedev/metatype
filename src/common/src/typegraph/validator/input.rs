// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use serde_json::Value;

use crate::typegraph::{
    visitor::{CurrentNode, Edge, TypeVisitor, VisitResult},
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
        let type_node = current_node.type_node;

        if let TypeNode::Function { .. } = type_node {
            // TODO suggest to use composition-- when available
            self.push_error(current_node.path, "Function is not allowed in input types.");
            return VisitResult::Continue(false);
        }

        // FIXME
        // if let Some(injection) = &type_node.base().injection {
        //     self.validate_injection(injection, current_node, context);
        // }

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
    #[allow(dead_code)]
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
                for source_idx in sources.iter() {
                    self.validate_parent_injection(source_idx, &current_node, context);
                }
            }
            _ => (),
        }
    }

    fn validate_parent_injection(
        &mut self,
        source_key: &str,
        current_node: &CurrentNode<'_>,
        context: &ValidatorContext<'_>,
    ) {
        let typegraph = context.get_typegraph();
        let parent_idx = current_node.find_function_parent().unwrap();
        let parent_type_node = typegraph.types.get(parent_idx as usize).unwrap();
        let source_idx = match parent_type_node {
            TypeNode::Object { data, .. } => {
                let source_idx = data.properties.get(source_key);
                match source_idx {
                    Some(idx) => *idx,
                    None => {
                        let keys = data.properties.keys().collect::<Vec<_>>();
                        self.push_error(
                            current_node.path,
                            format!(
                                "from_parent injection: source key {source_key} not found in parent; available keys: {keys:?}",
                                source_key = source_key
                            ),
                        );
                        return;
                    }
                }
            }
            _ => {
                self.push_error(
                    current_node.path,
                    "from_parent injection: parent is not an object".to_string(),
                );
                return;
            }
        };

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

impl<'a> CurrentNode<'a> {
    fn find_function_parent(&self) -> Option<u32> {
        let mut path = self.path.iter().rev();
        for seg in path.by_ref() {
            if let Edge::FunctionInput = seg.edge {
                break;
            }
        }
        path.next().map(|s| s.from)
    }
}
