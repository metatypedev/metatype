// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::typegraph::{
    visitor::{CurrentNode, TypeVisitor, VisitResult},
    TypeNode,
};

use super::{TypeVisitorContext, Validator};

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
