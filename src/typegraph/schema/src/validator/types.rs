// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
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

    fn push_nested(&mut self, title: impl Display, nested: Self) {
        self.errors.push(format!(" - {title}"));
        for error in nested.errors {
            self.errors.push(format!(" - - {error}"));
        }
    }
}

pub trait EnsureSubtypeOf<T = Self> {
    fn ensure_subtype_of(&self, sup: &T, typegraph: &Typegraph, errors: &mut ErrorCollector);
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
                errors.push(format!(
                    "'{key}' cannot be lower on the subtype: {} < {}",
                    left, right
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
                errors.push(format!(
                    "'{key}' cannot be higher on the subtype: {} > {}",
                    left, right
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
                    "'{key}' is not a multiple of the '{key}' of the supertype ({} % {} != 0)",
                    left, right
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

impl EnsureSubtypeOf<FloatTypeData> for IntegerTypeData {
    fn ensure_subtype_of(
        &self,
        other: &FloatTypeData,
        _tg: &Typegraph,
        errors: &mut ErrorCollector,
    ) {
        ensure_subtype_of_for_min(
            self.minimum.map(|m| m as f64),
            other.minimum,
            "minimum",
            errors,
        );
        ensure_subtype_of_for_max(
            self.maximum.map(|m| m as f64),
            other.maximum,
            "maximum",
            errors,
        );
        ensure_subtype_of_for_min(
            self.exclusive_minimum.map(|m| m as f64),
            other.exclusive_minimum,
            "exclusive_minimum",
            errors,
        );
        ensure_subtype_of_for_max(
            self.exclusive_maximum.map(|m| m as f64),
            other.exclusive_maximum,
            "exclusive_maximum",
            errors,
        );
        ensure_subtype_of_for_multiple_of(
            self.multiple_of.map(|m| m as f64),
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
                errors.push(format!(
                    "property {} is not allowed: it is not defined in the supertype",
                    key
                ));
            }
            right_keys.remove(key);
        }

        for key in right_keys {
            let type_idx = other.properties.get(key).unwrap();
            let type_node = tg.types.get(*type_idx as usize).unwrap();
            if !matches!(type_node, TypeNode::Optional { .. }) {
                errors.push(format!(
                    "property {} is required: it is not optional in the supertype",
                    key
                ));
            }
        }

        // FIXME https://linear.app/metatypedev/issue/MET-664/graph-check-the-semantics-of-type-refinements-on-tstruct
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

struct AnyOf<'a>(&'a [u32]);
struct OneOf<'a>(&'a [u32]);
struct AllOf<'a>(&'a [u32]);

impl<'a, 'b> EnsureSubtypeOf<AnyOf<'a>> for ExtendedTypeNode<'b> {
    fn ensure_subtype_of(
        &self,
        sup: &AnyOf<'a>,
        typegraph: &Typegraph,
        errors: &mut ErrorCollector,
    ) {
        let collectors: Vec<ErrorCollector> = vec![];
        for idx in sup.0 {
            let sup_type = ExtendedTypeNode::new(typegraph, *idx);
            let mut errors = ErrorCollector::default();
            self.ensure_subtype_of(&sup_type, typegraph, &mut errors);
            if errors.errors.is_empty() {
                return;
            }
        }
        errors.push("Expected at least one variant to be a supertype, got none");
        for (idx, nested) in collectors.into_iter().enumerate() {
            errors.push_nested(format!("Variant {}", idx), nested);
        }
    }
}

impl<'a, 'b> EnsureSubtypeOf<OneOf<'a>> for ExtendedTypeNode<'b> {
    fn ensure_subtype_of(
        &self,
        sup: &OneOf<'a>,
        typegraph: &Typegraph,
        errors: &mut ErrorCollector,
    ) {
        let collectors = sup
            .0
            .iter()
            .map(|idx| {
                let sup_type = ExtendedTypeNode::new(typegraph, *idx);
                let mut errors = ErrorCollector::default();
                self.ensure_subtype_of(&sup_type, typegraph, &mut errors);
                errors
            })
            .collect::<Vec<_>>();

        let match_count = collectors.iter().filter(|c| c.errors.is_empty()).count();
        match match_count {
            0 => {
                errors.push("Expected a single variant to be a supertype, got none");
                for (idx, nested) in collectors.into_iter().enumerate() {
                    errors.push_nested(format!("Variant {}", idx), nested);
                }
            }
            1 => {
                // nothing to do
            }
            _ => {
                errors.push(format!(
                    "Expected a single variant to be a supertype, got more: variants {}",
                    collectors
                        .iter()
                        .enumerate()
                        .filter(|(_, c)| c.errors.is_empty())
                        .map(|(i, _)| i.to_string())
                        .collect::<Vec<_>>()
                        .join(", "),
                ));
            }
        }
    }
}

impl<'b, S> EnsureSubtypeOf<S> for AllOf<'b>
where
    for<'a> ExtendedTypeNode<'a>: EnsureSubtypeOf<S>,
{
    fn ensure_subtype_of(&self, sup: &S, typegraph: &Typegraph, errors: &mut ErrorCollector) {
        let mut count = 0;
        let collectors = self
            .0
            .iter()
            .enumerate()
            .filter_map(|(i, type_idx)| {
                let mut errors = ErrorCollector::default();
                let sub_type = ExtendedTypeNode::new(typegraph, *type_idx);
                sub_type.ensure_subtype_of(sup, typegraph, &mut errors);
                if errors.errors.is_empty() {
                    None
                } else {
                    count += 1;
                    Some((i, errors))
                }
            })
            .collect::<Vec<_>>();

        if count > 0 {
            errors.push("Expected all variants to be a subtype");
            for (idx, nested) in collectors {
                errors.push_nested(format!("Variant {} is not a subtype", idx), nested);
            }
        }
    }
}

impl EnsureSubtypeOf for UnionTypeData {
    fn ensure_subtype_of(&self, sup: &Self, typegraph: &Typegraph, errors: &mut ErrorCollector) {
        AllOf(&self.any_of).ensure_subtype_of(&AnyOf(&sup.any_of), typegraph, errors);
    }
}

impl EnsureSubtypeOf for EitherTypeData {
    fn ensure_subtype_of(&self, sup: &Self, typegraph: &Typegraph, errors: &mut ErrorCollector) {
        AllOf(&self.one_of).ensure_subtype_of(&OneOf(&sup.one_of), typegraph, errors);
    }
}

impl EnsureSubtypeOf<UnionTypeData> for EitherTypeData {
    fn ensure_subtype_of(
        &self,
        sup: &UnionTypeData,
        typegraph: &Typegraph,
        errors: &mut ErrorCollector,
    ) {
        AllOf(&self.one_of).ensure_subtype_of(&AnyOf(&sup.any_of), typegraph, errors);
    }
}

impl EnsureSubtypeOf<EitherTypeData> for UnionTypeData {
    fn ensure_subtype_of(
        &self,
        sup: &EitherTypeData,
        typegraph: &Typegraph,
        errors: &mut ErrorCollector,
    ) {
        AllOf(&self.any_of).ensure_subtype_of(&OneOf(&sup.one_of), typegraph, errors);
    }
}

struct Enum<'a>(Option<&'a [String]>);

impl<'a, 'b> EnsureSubtypeOf<Enum<'a>> for Enum<'b> {
    fn ensure_subtype_of(&self, sup: &Enum<'a>, _tg: &Typegraph, errors: &mut ErrorCollector) {
        let sub = self.0.unwrap_or(&[]);
        let sup = sup.0.unwrap_or(&[]);
        if sub.is_empty() && !sup.is_empty() {
            errors.push("Expected the subtype to be an enum");
            return;
        }
        let sup = sup
            .iter()
            .map(|s| serde_json::to_value(s).unwrap())
            .collect::<Vec<_>>();
        let not_found = sub
            .iter()
            .map(|s| serde_json::to_value(s).unwrap())
            .enumerate()
            .filter(|(_, sup_v)| sup.iter().all(|v| !value_equals(v, sup_v)))
            .collect::<Vec<_>>();
        if !not_found.is_empty() {
            errors.push_nested("Expected all enum values to be defined on the supertype", {
                let mut nested = ErrorCollector::default();
                for (idx, sup_v) in not_found {
                    nested.push(format!(
                        "Value {} (#{}) is not defined on the supertype",
                        sup_v, idx
                    ));
                }
                nested
            });
        }
    }
}

// TODO move to different module
fn value_equals(left: &serde_json::Value, right: &serde_json::Value) -> bool {
    match (left, right) {
        (serde_json::Value::String(left), serde_json::Value::String(right)) => left == right,
        (serde_json::Value::Number(left), serde_json::Value::Number(right)) => left == right,
        (serde_json::Value::Bool(left), serde_json::Value::Bool(right)) => left == right,
        (serde_json::Value::Array(left), serde_json::Value::Array(right)) => left
            .iter()
            .zip(right.iter())
            .all(|(l, r)| value_equals(l, r)),
        (serde_json::Value::Object(left), serde_json::Value::Object(right)) => {
            left.len() == right.len()
                && left
                    .iter()
                    .all(|(k, v)| right.get(k).map_or(false, |r| value_equals(v, r)))
        }
        _ => false,
    }
}

impl<'a, 'b> EnsureSubtypeOf<ExtendedTypeNode<'b>> for ExtendedTypeNode<'a> {
    fn ensure_subtype_of(
        &self,
        sup: &ExtendedTypeNode<'b>,
        tg: &Typegraph,
        errors: &mut ErrorCollector,
    ) {
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
                (TypeNode::Optional { .. }, _) => {
                    errors.push("Optional type cannot be a subtype of a non-optional type");
                }
                (TypeNode::Boolean { .. }, TypeNode::Boolean { .. }) => { /* nothing to check */ }
                (
                    TypeNode::Integer {
                        data: sub,
                        base: sub_base,
                    },
                    TypeNode::Integer {
                        data: sup,
                        base: sup_base,
                    },
                ) => {
                    sub.ensure_subtype_of(sup, tg, errors);
                    Enum(sub_base.enumeration.as_deref()).ensure_subtype_of(
                        &Enum(sup_base.enumeration.as_deref()),
                        tg,
                        errors,
                    );
                }
                (
                    TypeNode::Float {
                        data: sub,
                        base: sub_base,
                    },
                    TypeNode::Float {
                        data: sup,
                        base: sup_base,
                    },
                ) => {
                    sub.ensure_subtype_of(sup, tg, errors);
                    Enum(sub_base.enumeration.as_deref()).ensure_subtype_of(
                        &Enum(sup_base.enumeration.as_deref()),
                        tg,
                        errors,
                    );
                }
                (
                    TypeNode::Integer {
                        data: sub,
                        base: sub_base,
                    },
                    TypeNode::Float {
                        data: sup,
                        base: sup_base,
                    },
                ) => {
                    sub.ensure_subtype_of(sup, tg, errors);
                    Enum(sub_base.enumeration.as_deref()).ensure_subtype_of(
                        &Enum(sup_base.enumeration.as_deref()),
                        tg,
                        errors,
                    );
                }
                (
                    TypeNode::String {
                        data: sub,
                        base: sub_base,
                    },
                    TypeNode::String {
                        data: sup,
                        base: sup_base,
                    },
                ) => {
                    sub.ensure_subtype_of(sup, tg, errors);
                    Enum(sub_base.enumeration.as_deref()).ensure_subtype_of(
                        &Enum(sup_base.enumeration.as_deref()),
                        tg,
                        errors,
                    );
                }
                (TypeNode::File { data: sub, .. }, TypeNode::File { data: sup, .. }) => {
                    sub.ensure_subtype_of(sup, tg, errors)
                }
                (
                    TypeNode::Object {
                        data: sub,
                        base: sub_base,
                    },
                    TypeNode::Object {
                        data: sup,
                        base: sup_base,
                    },
                ) => {
                    sub.ensure_subtype_of(sup, tg, errors);
                    Enum(sub_base.enumeration.as_deref()).ensure_subtype_of(
                        &Enum(sup_base.enumeration.as_deref()),
                        tg,
                        errors,
                    );
                }
                (TypeNode::List { data: sub, .. }, TypeNode::List { data: sup, .. }) => {
                    sub.ensure_subtype_of(sup, tg, errors)
                }
                (TypeNode::Union { data: sub, .. }, _) => {
                    AllOf(&sub.any_of).ensure_subtype_of(sup, tg, errors);
                }
                (TypeNode::Either { data: sub, .. }, _) => {
                    AllOf(&sub.one_of).ensure_subtype_of(sup, tg, errors);
                }
                (_, TypeNode::Union { data: sup, .. }) => {
                    self.ensure_subtype_of(&AnyOf(&sup.any_of), tg, errors);
                }
                (_, TypeNode::Either { data: sup, .. }) => {
                    self.ensure_subtype_of(&OneOf(&sup.one_of), tg, errors);
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
