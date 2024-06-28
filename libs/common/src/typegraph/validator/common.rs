// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::typegraph::{EitherTypeData, TypeNode, Typegraph, UnionTypeData};

impl Typegraph {
    pub fn check_enum_values(
        &self,
        type_idx: u32,
        enum_values: &[String],
    ) -> Result<(), Vec<String>> {
        let type_node = self.types.get(type_idx as usize).unwrap();
        let mut errors = Vec::new();
        if matches!(type_node, TypeNode::Optional { .. }) {
            errors.push("optional not cannot have enumerated values".to_owned());
        } else {
            for value in enum_values {
                match serde_json::from_str::<serde_json::Value>(value) {
                    Ok(val) => match self.validate_value(type_idx, &val) {
                        Ok(_) => {}
                        Err(err) => errors.push(err.to_string()),
                    },
                    Err(e) => errors.push(format!(
                        "Error while deserializing enum value {value:?}: {e:?}"
                    )),
                }
            }
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }

    pub fn collect_nested_variants_into(&self, out: &mut Vec<u32>, variants: &[u32]) {
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
