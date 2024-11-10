// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

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
