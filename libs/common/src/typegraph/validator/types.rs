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
    sub_min: Option<T>,
    sup_min: Option<T>,
    key: &str,
    errors: &mut ErrorCollector,
) where
    T: Display + PartialOrd,
{
    if let Some(sub_min) = sub_min {
        if let Some(sup_min) = sup_min {
            if sub_min < sup_min {
                errors.push(format!("{key} is less than the {key} of the supertype"));
            }
        }
    } else if sup_min.is_some() {
        errors.push(format!("{key} is not defined in the subtype"));
    }
}

fn ensure_subtype_of_for_max<T>(
    sub_max: Option<T>,
    sup_max: Option<T>,
    key: &str,
    errors: &mut ErrorCollector,
) where
    T: Display + PartialOrd,
{
    if let Some(sub_max) = sub_max {
        if let Some(sup_max) = sup_max {
            if sub_max > sup_max {
                errors.push(format!("{key} is greater than the {key} of the supertype"));
            }
        }
    } else if sup_max.is_some() {
        errors.push(format!("{key} is not defined in the subtype"));
    }
}

fn ensure_subtype_of_for_multiple_of<T>(
    sub_multiple_of: Option<T>,
    sup_multiple_of: Option<T>,
    key: &str,
    errors: &mut ErrorCollector,
) where
    T: Display + std::ops::Rem<Output = T> + Copy + Default + PartialEq,
{
    if let Some(sub_multiple_of) = sub_multiple_of {
        if let Some(sup_multiple_of) = sup_multiple_of {
            if sub_multiple_of % sup_multiple_of != Default::default() {
                errors.push(format!(
                    "{key} is not a multiple of the {key} of the supertype"
                ));
            }
        }
    } else if sup_multiple_of.is_some() {
        errors.push(format!("{key} is not defined in the subtype"));
    }
}

impl EnsureSubtypeOf for IntegerTypeData {
    fn ensure_subtype_of(&self, sup: &Self, _tg: &Typegraph, errors: &mut ErrorCollector) {
        ensure_subtype_of_for_min(self.minimum, sup.minimum, "minimum", errors);
        ensure_subtype_of_for_max(self.maximum, sup.maximum, "maximum", errors);
        ensure_subtype_of_for_min(
            self.exclusive_minimum,
            sup.exclusive_minimum,
            "exclusive_minimum",
            errors,
        );
        ensure_subtype_of_for_max(
            self.exclusive_maximum,
            sup.exclusive_maximum,
            "exclusive_maximum",
            errors,
        );
        ensure_subtype_of_for_multiple_of(self.multiple_of, sup.multiple_of, "multiple_of", errors);
    }
}

impl EnsureSubtypeOf for FloatTypeData {
    fn ensure_subtype_of(&self, sup: &Self, _tg: &Typegraph, errors: &mut ErrorCollector) {
        ensure_subtype_of_for_min(self.minimum, sup.minimum, "minimum", errors);
        ensure_subtype_of_for_max(self.maximum, sup.maximum, "maximum", errors);
        ensure_subtype_of_for_min(
            self.exclusive_minimum,
            sup.exclusive_minimum,
            "exclusive_minimum",
            errors,
        );
        ensure_subtype_of_for_max(
            self.exclusive_maximum,
            sup.exclusive_maximum,
            "exclusive_maximum",
            errors,
        );
        ensure_subtype_of_for_multiple_of(self.multiple_of, sup.multiple_of, "multiple_of", errors);
    }
}

impl EnsureSubtypeOf for StringTypeData {
    fn ensure_subtype_of(&self, sup: &Self, _tg: &Typegraph, errors: &mut ErrorCollector) {
        ensure_subtype_of_for_min(self.min_length, sup.min_length, "minimum_length", errors);
        ensure_subtype_of_for_max(self.max_length, sup.max_length, "maximum_length", errors);

        if let Some(sub_pattern) = &self.pattern {
            if let Some(sup_pattern) = &sup.pattern {
                if sub_pattern != sup_pattern {
                    errors.push("pattern does not match the pattern of the supertype");
                }
            }
        } else if sup.pattern.is_some() {
            errors.push("pattern is not defined in the subtype");
        }

        if let Some(sub_format) = &self.format {
            if let Some(sup_format) = &sup.format {
                if sub_format != sup_format {
                    errors.push("format does not match the format of the supertype");
                }
            }
        } else if sup.format.is_some() {
            errors.push("format is not defined in the subtype");
        }
    }
}

impl EnsureSubtypeOf for FileTypeData {
    fn ensure_subtype_of(&self, sup: &Self, _tg: &Typegraph, errors: &mut ErrorCollector) {
        ensure_subtype_of_for_min(self.min_size, sup.min_size, "minimum_size", errors);
        ensure_subtype_of_for_max(self.max_size, sup.max_size, "maximum_size", errors);

        if let Some(sub_mime_types) = &self.mime_types {
            if let Some(sup_mime_types) = &sup.mime_types {
                // check if sub_mime_types is a subset of sup_mime_types
                if sub_mime_types
                    .iter()
                    .any(|sub| !sup_mime_types.contains(sub))
                {
                    errors.push("mime_types is not a subset of the mime_types of the supertype");
                }
            }
        } else if sup.mime_types.is_some() {
            errors.push("mime_types is not defined in the subtype");
        }
    }
}

impl EnsureSubtypeOf for ObjectTypeData {
    fn ensure_subtype_of(&self, sup: &Self, tg: &Typegraph, errors: &mut ErrorCollector) {
        let mut sup_props_left = sup.properties.keys().collect::<HashSet<_>>();

        for (key, sub_idx) in &self.properties {
            if let Some(sup_idx) = sup.properties.get(key) {
                ExtendedTypeNode::new(tg, *sub_idx).ensure_subtype_of(
                    &ExtendedTypeNode::new(tg, *sup_idx),
                    tg,
                    errors,
                );
            } else {
                errors.push(format!("property {} is not defined in the supertype", key));
            }
            sup_props_left.remove(key);
        }

        for key in sup_props_left {
            let type_idx = sup.properties.get(key).unwrap();
            let type_node = tg.types.get(*type_idx as usize).unwrap();
            if !matches!(type_node, TypeNode::Optional { .. }) {
                errors.push(format!("property {} is not optional in the supertype", key));
            }
        }

        for key in &self.required {
            if !sup.required.contains(key) {
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
            let mut error_collector = ErrorCollector::default();
            let mut found = false;
            for sup_idx in sup.0 {
                let sup_type = ExtendedTypeNode::new(typegraph, *sup_idx);

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
                (TypeNode::Function { .. }, _) | (_, TypeNode::Function { .. }) => {
                    errors.push("Function types are not supported");
                }
                _ => errors.push("Type mismatch"),
            }
        }
    }
}
