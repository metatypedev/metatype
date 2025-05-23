// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashSet;

use anyhow::{anyhow, bail, Result};
use serde_json::Value;

use crate::{
    EitherTypeData, FloatTypeData, IntegerTypeData, ListTypeData, ObjectTypeData, StringTypeData,
    TypeNode, Typegraph, UnionTypeData,
};

fn to_string(value: &Value) -> String {
    serde_json::to_string(value).unwrap()
}

// TODO validation path
impl Typegraph {
    pub fn validate_value(&self, type_idx: u32, value: &Value) -> Result<()> {
        let type_node = &self.types[type_idx as usize];

        match type_node {
            TypeNode::Any { .. } => Ok(()),
            TypeNode::Integer { data, .. } => self.validate_integer(data, value),
            TypeNode::Float { data, .. } => self.validate_float(data, value),
            TypeNode::Boolean { .. } => value.as_bool().map(|_| ()).ok_or_else(|| {
                anyhow!("Expected a boolean got '{value}'", value = to_string(value))
            }),
            TypeNode::String { data, .. } => self.validate_string(data, value),
            TypeNode::File { .. } => bail!("Literal file not supported"),
            TypeNode::Optional { data, .. } => {
                if value.is_null() {
                    Ok(())
                } else {
                    self.validate_value(data.item, value)
                }
            }
            TypeNode::List { data, .. } => self.validate_array(data, value),
            TypeNode::Object { data, .. } => self.validate_object(data, value),
            TypeNode::Function { .. } => Err(anyhow!("Unexpected function type")),
            TypeNode::Union { data, .. } => self.validate_union(data, value),
            TypeNode::Either { data, .. } => self.validate_either(data, value),
        }
    }

    fn validate_integer(&self, data: &IntegerTypeData, value: &Value) -> Result<()> {
        let Value::Number(n) = value else {
            bail!("Expected number got '{}'", to_string(value));
        };
        let Some(value) = n.as_i64().map(|value| value.try_into()).transpose()? else {
            bail!("Number value {value:?} cannot be stored in f64");
        };
        if let Some(min) = data.minimum {
            number_validator::expect_min(min, value)?;
        }
        if let Some(max) = data.maximum {
            number_validator::expect_max(max, value)?;
        }
        if let Some(xmin) = data.exclusive_minimum {
            number_validator::expect_xmin(xmin, value)?;
        }
        if let Some(xmax) = data.exclusive_maximum {
            number_validator::expect_xmax(xmax, value)?;
        }
        if let Some(divisor) = data.multiple_of.as_ref() {
            if value % divisor == 0 {
                bail!("Expected a multiple of {divisor}, got {value}");
            }
        }
        Ok(())
    }

    fn validate_float(&self, data: &FloatTypeData, value: &Value) -> Result<()> {
        let Value::Number(n) = value else {
            bail!("Expected float got '{}'", to_string(value));
        };
        let Some(value) = n.as_f64() else {
            bail!("Float value {value:?} cannot be stored in f64");
        };
        if let Some(min) = data.minimum {
            number_validator::expect_min(min, value)?;
        }
        if let Some(max) = data.maximum {
            number_validator::expect_max(max, value)?;
        }
        if let Some(xmin) = data.exclusive_minimum {
            number_validator::expect_xmin(xmin, value)?;
        }
        if let Some(xmax) = data.exclusive_maximum {
            number_validator::expect_xmax(xmax, value)?;
        }
        if let Some(divisor) = data.multiple_of.as_ref() {
            let quot = value / divisor;
            if quot.round() != quot {
                bail!("Expected a multiple of {divisor}, got {value}");
            }
        }
        Ok(())
    }

    fn validate_string(&self, data: &StringTypeData, value: &Value) -> Result<()> {
        let s = value
            .as_str()
            .ok_or_else(|| anyhow!("Expected a string, got '{}'", to_string(value)))?;
        if let Some(min_length) = data.min_length {
            if s.len() < min_length as usize {
                bail!(
                    "Expected a minimum length of {min_length}, got {s:?} (len={})",
                    s.len()
                );
            }
        }
        if let Some(max_length) = data.max_length {
            if s.len() > max_length as usize {
                bail!(
                    "Expected a maximun length of {max_length}, got {s:?} (len={})",
                    s.len()
                );
            }
        }
        // TODO pattern, format
        Ok(())
    }

    fn validate_array(&self, data: &ListTypeData, value: &Value) -> Result<()> {
        let array = value
            .as_array()
            .ok_or_else(|| anyhow!("Expected an array got '{}'", to_string(value)))?;

        if let Some(max_items) = data.max_items {
            if array.len() > max_items as usize {
                bail!(
                    "Expected a maximum item count of {max_items} in array '{arr}' (len={})",
                    array.len(),
                    arr = to_string(value),
                );
            }
        }

        if let Some(min_items) = data.min_items {
            if array.len() < min_items as usize {
                bail!(
                    "Expected a minimum item count of {min_items} in array '{arr}' (len={})",
                    array.len(),
                    arr = to_string(value),
                );
            }
        }

        for item in array {
            self.validate_value(data.items, item)?;
        }
        Ok(())
    }

    fn validate_object(&self, data: &ObjectTypeData, value: &Value) -> Result<()> {
        let object = value.as_object().ok_or_else(|| {
            anyhow!(
                "Expected an object, got '{value}'",
                value = to_string(value)
            )
        })?;

        let mut remaining_keys = object.keys().collect::<HashSet<_>>();
        for (key, typ) in data.properties.iter() {
            match object.get(key) {
                None => {
                    if !matches!(self.types[*typ as usize], TypeNode::Optional { .. }) {
                        bail!(
                            "Required field {key:?} not found in object '{value}'",
                            value = to_string(value)
                        );
                    }
                }
                Some(val) => {
                    self.validate_value(*typ, val)?;
                    remaining_keys.remove(key);
                }
            }
        }

        // additional properties?
        if !remaining_keys.is_empty() {
            bail!(
                "Unexpected fields {} in object {:?}",
                remaining_keys
                    .iter()
                    .map(|k| format!("{k:?}"))
                    .collect::<Vec<_>>()
                    .join(", "),
                to_string(value),
            );
        }

        Ok(())
    }

    fn validate_union(&self, data: &UnionTypeData, value: &Value) -> Result<()> {
        for &variant in data.any_of.iter() {
            if self.validate_value(variant, value).is_ok() {
                return Ok(());
            }
        }
        bail!(
            "Value '{value}' did not match any of the variants of the union",
            value = to_string(value)
        );
    }

    fn validate_either(&self, data: &EitherTypeData, value: &Value) -> Result<()> {
        let mut valid_variants = vec![];
        for &variant in data.one_of.iter() {
            if self.validate_value(variant, value).is_ok() {
                valid_variants.push(variant);
            }
        }
        match valid_variants.len() {
            0 => bail!(
                "Value '{value}' did not match any of the variants of the either",
                value = to_string(value)
            ),
            1 => Ok(()),
            _ => bail!(
                "Value '{value}' matched to more than one variant onf the either: {}",
                valid_variants
                    .iter()
                    .map(|v| format!("#{v}"))
                    .collect::<Vec<_>>()
                    .join(", "),
                value = to_string(value)
            ),
        }
    }
}

mod number_validator {
    use anyhow::{bail, Result};
    use std::fmt::Display;

    pub fn expect_min<T: Display + PartialOrd>(min: T, value: T) -> Result<()> {
        if value < min {
            bail!("Expected a minimum value of {min}, got {value}");
        }
        Ok(())
    }

    pub fn expect_max<T: Display + PartialOrd>(max: T, value: T) -> Result<()> {
        if value > max {
            bail!("Expected a maximum value of {max}, got {value}");
        }
        Ok(())
    }

    pub fn expect_xmin<T: Display + PartialOrd>(xmin: T, value: T) -> Result<()> {
        if value <= xmin {
            bail!("Expected an exclusive minimum value of {xmin}, got {value}");
        }
        Ok(())
    }

    pub fn expect_xmax<T: Display + PartialOrd>(xmax: T, value: T) -> Result<()> {
        if value >= xmax {
            bail!("Expected an exclusive maximum value of {xmax}, got {value}");
        }
        Ok(())
    }
}
