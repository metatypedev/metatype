// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::typegraph::{
    EitherTypeData, FileTypeData, FloatTypeData, IntegerTypeData, ListTypeData, ObjectTypeData,
    StringTypeData, TypeNode, Typegraph, UnionTypeData,
};
use std::{collections::HashSet, fmt::Display};

pub struct ExtendedTypeNode<'a>(u32, &'a TypeNode);

impl<'a> ExtendedTypeNode<'a> {
    pub fn new(typegraph: &'a Typegraph, idx: u32) -> Self {
        ExtendedTypeNode(idx, typegraph.types.get(idx as usize).unwrap())
    }
}

#[derive(Debug, Default)]
pub struct ErrorCollector {
    pub errors: Vec<String>,
}

impl ErrorCollector {
    fn push(&mut self, message: impl Into<String>) {
        self.errors.push(message.into());
    }
}

pub trait EnsureSubtypeOf {
    fn ensure_subtype_of(&self, sup: &Self, typegraph: &Typegraph, errors: &mut ErrorCollector);
}

fn ensure_subtype_of_for_min<T>(
    left: Option<T>,
    right: Option<T>,
    key: &str,
    errors: &mut ErrorCollector,
) where
    T: Display + PartialOrd,
{
    match (left, right) {
        (Some(left), Some(right)) => {
            if left < right {
                errors.push(format!("'{key}' cannot be lower on the subtype"));
            }
        }
        (None, Some(_)) => {
            errors.push(format!(
                "'{key}' is required on the subtype if it is defined on the supertype"
            ));
        }
        _ => {}
    }
}

fn ensure_subtype_of_for_max<T>(
    left: Option<T>,
    right: Option<T>,
    key: &str,
    errors: &mut ErrorCollector,
) where
    T: Display + PartialOrd,
{
    match (left, right) {
        (Some(left), Some(right)) => {
            if left > right {
                errors.push(format!("'{key}' cannot be higher on the subtype"));
            }
        }
        (None, Some(_)) => {
            errors.push(format!(
                "'{key}' is required on the subtype if it is defined on the supertype"
            ));
        }
        _ => {}
    }
}

fn ensure_subtype_of_for_multiple_of<T>(
    left: Option<T>,
    right: Option<T>,
    key: &str,
    errors: &mut ErrorCollector,
) where
    T: Display + std::ops::Rem<Output = T> + Copy + Default + PartialEq,
{
    match (left, right) {
        (Some(left), Some(right)) => {
            if left % right != Default::default() {
                errors.push(format!(
                    "'{key}' is not a multiple of the '{key}' of the supertype"
                ));
            }
        }
        (None, Some(_)) => {
            errors.push(format!(
                "'{key}' is required on the subtype if it is defined on the supertype"
            ));
        }
        _ => {}
    }
}

impl EnsureSubtypeOf for IntegerTypeData {
    fn ensure_subtype_of(&self, other: &Self, _tg: &Typegraph, errors: &mut ErrorCollector) {
        ensure_subtype_of_for_min(self.minimum, other.minimum, "minimum", errors);
        ensure_subtype_of_for_max(self.maximum, other.maximum, "maximum", errors);
        ensure_subtype_of_for_min(
            self.exclusive_minimum,
            other.exclusive_minimum,
            "exclusive_minimum",
            errors,
        );
        ensure_subtype_of_for_max(
            self.exclusive_maximum,
            other.exclusive_maximum,
            "exclusive_maximum",
            errors,
        );
        ensure_subtype_of_for_multiple_of(
            self.multiple_of,
            other.multiple_of,
            "multiple_of",
            errors,
        );
    }
}

impl EnsureSubtypeOf for FloatTypeData {
    fn ensure_subtype_of(&self, other: &Self, _tg: &Typegraph, errors: &mut ErrorCollector) {
        ensure_subtype_of_for_min(self.minimum, other.minimum, "minimum", errors);
        ensure_subtype_of_for_max(self.maximum, other.maximum, "maximum", errors);
        ensure_subtype_of_for_min(
            self.exclusive_minimum,
            other.exclusive_minimum,
            "exclusive_minimum",
            errors,
        );
        ensure_subtype_of_for_max(
            self.exclusive_maximum,
            other.exclusive_maximum,
            "exclusive_maximum",
            errors,
        );
        ensure_subtype_of_for_multiple_of(
            self.multiple_of,
            other.multiple_of,
            "multiple_of",
            errors,
        );
    }
}

impl EnsureSubtypeOf for StringTypeData {
    fn ensure_subtype_of(&self, other: &Self, _tg: &Typegraph, errors: &mut ErrorCollector) {
        ensure_subtype_of_for_min(self.min_length, other.min_length, "minimum_length", errors);
        ensure_subtype_of_for_max(self.max_length, other.max_length, "maximum_length", errors);

        match (&self.pattern, &other.pattern) {
            (Some(left), Some(right)) => {
                if left != right {
                    errors.push(format!(
                        "'pattern' is required to be exactly the same as the supertype's: {} != {}",
                        left, right
                    ));
                }
            }
            (None, Some(_)) => {
                errors
                    .push("'pattern' is required on the subtype if it is defined on the supertype");
            }
            _ => {}
        }

        match (&self.format, &other.format) {
            (Some(left), Some(right)) => {
                if left != right {
                    errors.push(format!(
                        "'format' is required to be the same as the supertype's: {} != {}",
                        left, right
                    ));
                }
            }
            (None, Some(_)) => {
                errors
                    .push("'format' is required on the subtype if it is defined on the supertype");
            }
            _ => {}
        }
    }
}

impl EnsureSubtypeOf for FileTypeData {
    fn ensure_subtype_of(&self, other: &Self, _tg: &Typegraph, errors: &mut ErrorCollector) {
        ensure_subtype_of_for_min(self.min_size, other.min_size, "minimum_size", errors);
        ensure_subtype_of_for_max(self.max_size, other.max_size, "maximum_size", errors);

        // FIXME consistency: the name on the SDK is 'allow'
        match (&self.mime_types, &other.mime_types) {
            (Some(left), Some(right)) => {
                // O(n * m) but n and m are _usually_ small
                if left.iter().any(|m| !right.contains(m)) {
                    errors.push("'mime_types' is required to be a subset of the supertype's");
                }
            }
            (None, Some(_)) => {
                errors.push(
                    "'mime_types' is required on the subtype if it is defined on the supertype",
                );
            }
            _ => {}
        }
    }
}

impl EnsureSubtypeOf for ObjectTypeData {
    fn ensure_subtype_of(&self, other: &Self, tg: &Typegraph, errors: &mut ErrorCollector) {
        let mut right_keys = other.properties.keys().collect::<HashSet<_>>();

        for (key, left_idx) in &self.properties {
            if let Some(right_idx) = other.properties.get(key) {
                // TODO add some context on the error messages
                ExtendedTypeNode::new(tg, *left_idx).ensure_subtype_of(
                    &ExtendedTypeNode::new(tg, *right_idx),
                    tg,
                    errors,
                );
            } else {
                errors.push(format!("property {} is not defined in the supertype", key));
            }
            right_keys.remove(key);
        }

        for key in right_keys {
            let type_idx = other.properties.get(key).unwrap();
            let type_node = tg.types.get(*type_idx as usize).unwrap();
            if !matches!(type_node, TypeNode::Optional { .. }) {
                errors.push(format!("property {} is not optional in the supertype", key));
            }
        }

        for key in &self.required {
            if !other.required.contains(key) {
                errors.push(format!("property {} is not required in the supertype", key));
            }
        }
    }
}

impl EnsureSubtypeOf for ListTypeData {
    fn ensure_subtype_of(&self, sup: &Self, typegraph: &Typegraph, errors: &mut ErrorCollector) {
        ensure_subtype_of_for_min(self.min_items, sup.min_items, "minimum_items", errors);
        ensure_subtype_of_for_max(self.max_items, sup.max_items, "maximum_items", errors);
        if self.unique_items.unwrap_or(false) && !sup.unique_items.unwrap_or(false) {
            errors.push("unique_items is not defined in the subtype");
        }
        ExtendedTypeNode::new(typegraph, self.items).ensure_subtype_of(
            &ExtendedTypeNode::new(typegraph, sup.items),
            typegraph,
            errors,
        );
    }
}

impl EnsureSubtypeOf for UnionTypeData {
    fn ensure_subtype_of(&self, sup: &Self, typegraph: &Typegraph, errors: &mut ErrorCollector) {
        GenericUnionVariants(&self.any_of).ensure_subtype_of(
            &GenericUnionVariants(&sup.any_of),
            typegraph,
            errors,
        );
    }
}

impl EnsureSubtypeOf for EitherTypeData {
    fn ensure_subtype_of(&self, sup: &Self, typegraph: &Typegraph, errors: &mut ErrorCollector) {
        GenericUnionVariants(&self.one_of).ensure_subtype_of(
            &GenericUnionVariants(&sup.one_of),
            typegraph,
            errors,
        );
    }
}

struct GenericUnionVariants<'a>(&'a [u32]);
impl<'a> EnsureSubtypeOf for GenericUnionVariants<'a> {
    fn ensure_subtype_of(&self, sup: &Self, typegraph: &Typegraph, errors: &mut ErrorCollector) {
        // any variant is a subtype of a variant in the supertype
        for sub_idx in self.0 {
            let sub_type = ExtendedTypeNode::new(typegraph, *sub_idx);
            let mut found = false;
            for sup_idx in sup.0 {
                let sup_type = ExtendedTypeNode::new(typegraph, *sup_idx);

                let mut error_collector = ErrorCollector::default();
                sub_type.ensure_subtype_of(&sup_type, typegraph, &mut error_collector);
                if error_collector.errors.is_empty() {
                    found = true;
                    break;
                }
            }
            if !found {
                errors.push("Union type does not match the supertype");
            }
        }
    }
}

impl<'a> EnsureSubtypeOf for ExtendedTypeNode<'a> {
    fn ensure_subtype_of(&self, sup: &Self, tg: &Typegraph, errors: &mut ErrorCollector) {
        let sub_idx = self.0;
        let sup_idx = sup.0;
        if sub_idx != sup_idx {
            // self.1.ensure_subtype_of(sup.1, typegraph, errors);
            match (self.1, sup.1) {
                (TypeNode::Optional { data: sub, .. }, TypeNode::Optional { data: sup, .. }) => {
                    ExtendedTypeNode::new(tg, sub.item).ensure_subtype_of(
                        &ExtendedTypeNode::new(tg, sup.item),
                        tg,
                        errors,
                    );
                }
                (_, TypeNode::Optional { data: sup, .. }) => {
                    self.ensure_subtype_of(&ExtendedTypeNode::new(tg, sup.item), tg, errors);
                }
                (TypeNode::Boolean { .. }, TypeNode::Boolean { .. }) => { /* nothing to check */ }
                (TypeNode::Integer { data: sub, .. }, TypeNode::Integer { data: sup, .. }) => {
                    sub.ensure_subtype_of(sup, tg, errors)
                }
                (TypeNode::Float { data: sub, .. }, TypeNode::Float { data: sup, .. }) => {
                    sub.ensure_subtype_of(sup, tg, errors)
                }
                (TypeNode::String { data: sub, .. }, TypeNode::String { data: sup, .. }) => {
                    sub.ensure_subtype_of(sup, tg, errors)
                }
                (TypeNode::File { data: sub, .. }, TypeNode::File { data: sup, .. }) => {
                    sub.ensure_subtype_of(sup, tg, errors)
                }
                (TypeNode::Object { data: sub, .. }, TypeNode::Object { data: sup, .. }) => {
                    sub.ensure_subtype_of(sup, tg, errors)
                }
                (TypeNode::List { data: sub, .. }, TypeNode::List { data: sup, .. }) => {
                    sub.ensure_subtype_of(sup, tg, errors)
                }
                (TypeNode::Union { data: sub, .. }, TypeNode::Union { data: sup, .. }) => {
                    sub.ensure_subtype_of(sup, tg, errors)
                }
                (TypeNode::Either { data: sub, .. }, TypeNode::Union { data: sup, .. }) => {
                    GenericUnionVariants(&sub.one_of).ensure_subtype_of(
                        &GenericUnionVariants(&sup.any_of),
                        tg,
                        errors,
                    )
                }
                (TypeNode::Union { data: sub, .. }, TypeNode::Either { data: sup, .. }) => {
                    GenericUnionVariants(&sub.any_of).ensure_subtype_of(
                        &GenericUnionVariants(&sup.one_of),
                        tg,
                        errors,
                    )
                }
                (TypeNode::Either { data: sub, .. }, TypeNode::Either { data: sup, .. }) => {
                    sub.ensure_subtype_of(sup, tg, errors)
                }
                (_, TypeNode::Union { data: sup, .. }) => {
                    let sub = UnionTypeData {
                        any_of: vec![sub_idx],
                    };
                    sub.ensure_subtype_of(sup, tg, errors);
                }
                (_, TypeNode::Either { data: sup, .. }) => {
                    let sub = EitherTypeData {
                        one_of: vec![sub_idx],
                    };
                    sub.ensure_subtype_of(sup, tg, errors);
                }
                (_, TypeNode::Function { .. }) => {
                    errors.push("Function types are not supported for supertype");
                }
                (TypeNode::Function { data, .. }, _) => {
                    ExtendedTypeNode::new(tg, data.output).ensure_subtype_of(sup, tg, errors);
                }
                (x, y) => errors.push(format!(
                    "Type mismatch: {} to {}",
                    x.type_name(),
                    y.type_name()
                )),
            }
        }
    }
}
