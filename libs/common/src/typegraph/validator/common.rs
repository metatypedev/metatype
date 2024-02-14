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

    pub fn check_union_variants(&self, variants: &[u32]) -> Result<(), String> {
        let mut object_count = 0;

        for variant_type in variants
            .iter()
            .map(|idx| self.types.get(*idx as usize).unwrap())
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
                    let item_type = self.types.get(data.items as usize).unwrap();
                    if !item_type.is_scalar() {
                        return Err(format!(
                            "array of '{}' not allowed as union/either variant",
                            item_type.type_name()
                        ));
                    }
                }
                _ => {
                    return Err(format!(
                        "type '{}' not allowed as union/either variant",
                        variant_type.type_name()
                    ));
                }
            }
        }

        if object_count != 0 && object_count != variants.len() {
            return Err("union variants must either be all scalars or all objects".to_owned());
        }

        Ok(())
    }
}
