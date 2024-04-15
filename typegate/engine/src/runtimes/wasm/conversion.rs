// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use std::collections::HashSet;

use anyhow::{bail, Context};
use mt_deno::deno::deno_runtime::deno_core::serde_json;
use serde::{Deserialize, Serialize};
use wasmtime::component::{self, Type, Val};

#[derive(Serialize, Deserialize, Debug)]
pub struct WitVariant {
    pub tag: String,
    pub value: serde_json::Value,
}

/// Provide a dummy value used for *allocating* function call results from a component
pub fn unlift_type_to_default_value(
    ty: &component::Type,
) -> anyhow::Result<wasmtime::component::Val> {
    let ret = match ty {
        Type::Bool => Val::Bool(false),
        Type::S8 => Val::S8(0),
        Type::U8 => Val::U8(0),
        Type::S16 => Val::S16(0),
        Type::U16 => Val::U16(0),
        Type::S32 => Val::S32(0),
        Type::U32 => Val::U32(0),
        Type::S64 => Val::S64(0),
        Type::U64 => Val::U64(0),
        Type::Float32 => Val::Float32(0.0),
        Type::Float64 => Val::Float64(0.0),
        Type::Char => Val::Char(0 as char),
        Type::String => Val::String("".into()),
        Type::List(list_ty) => {
            // let content = unlift_type_to_default_value(&list_ty.ty())?;
            list_ty.new_val(vec![].into())?
        }
        Type::Option(option_ty) => {
            let content = unlift_type_to_default_value(&option_ty.ty())?;
            option_ty.new_val(Some(content))?
        }
        Type::Result(result_ty) => {
            let content = match result_ty.ok() {
                Some(ok_ty) => Ok(Some(unlift_type_to_default_value(&ok_ty)?)),
                None => {
                    let err_ty = result_ty.err().unwrap();
                    Err(Some(unlift_type_to_default_value(&err_ty)?))
                }
            };
            result_ty.new_val(content)?
        }
        Type::Tuple(tuple_ty) => {
            // tuple<t1, t2, ..>
            let out = tuple_ty
                .types()
                .map(|ty| unlift_type_to_default_value(&ty))
                .collect::<anyhow::Result<Vec<_>>>()?;
            tuple_ty.new_val(out.into())?
        }
        Type::Enum(enum_ty) => {
            // enum my-enum { a, b, c, .. }
            let names = enum_ty.names().collect::<Vec<_>>();
            if names.is_empty() {
                bail!("invalid state: enum {:?} has no variants", ty);
            }
            enum_ty.new_val(names.first().unwrap())?
        }
        Type::Variant(variant_ty) => {
            // variant my-variant { a(b), c(string), d, .. }
            let cases = variant_ty.cases().collect::<Vec<_>>();
            if cases.is_empty() {
                bail!("invalid state: variant {:?} has no cases", ty);
            }
            let first_case = cases.first().unwrap();
            let first_payload = first_case
                .ty
                .clone()
                .map(|fst_ty| unlift_type_to_default_value(&fst_ty))
                .map_or(Ok(None), |v| v.map(Some))?;
            variant_ty.new_val(first_case.name, first_payload)?
        }
        Type::Record(record_ty) => {
            // record some-rec { a: string, b: c, d: u8, .. }
            let values = record_ty
                .fields()
                .map(|f| unlift_type_to_default_value(&f.ty).map(|val| (f.name, val)))
                .collect::<anyhow::Result<Vec<(_, _)>>>()?;
            record_ty.new_val(values)?
        }
        Type::Flags(flags) => flags.new_val(&[])?,
        Type::Own(_) | Type::Borrow(_) => {
            // TODO: research
            bail!("{:?} is currently not supported", ty)
        }
    };
    Ok(ret)
}

/// Convert json object to a wit `record` or `variant`
pub fn object_to_wasmtime_val(
    object: &serde_json::Map<String, serde_json::Value>,
    canonical_ty: &component::Type,
) -> anyhow::Result<component::Val> {
    match canonical_ty {
        Type::Record(record) => {
            let given_fields = object
                .iter()
                .map(|(name, _)| name.to_owned())
                .collect::<HashSet<_>>();
            let canon_fields = record
                .fields()
                .map(|f| f.name.to_owned())
                .collect::<HashSet<_>>();
            let extra_fields = &given_fields - &canon_fields;
            if !extra_fields.is_empty() {
                let extra = Vec::from_iter(extra_fields.iter().map(|v| format!("'{v}'")));
                let prop = Vec::from_iter(canon_fields.iter().map(|v| format!("'{v}'")));
                bail!(
                    "none of the fields [{}] match any of [{}]",
                    extra.join(", "),
                    prop.join(", ")
                )
            }
            let mut values = vec![];
            for field in record.fields() {
                let converted_value = match object.get(field.name) {
                    Some(value) => value_to_wasmtime_val(value, &field.ty),
                    None => {
                        if let Type::Option(option_ty) = field.ty {
                            option_ty.new_val(None)
                        } else {
                            bail!("field '{}' is not optional", field.name);
                        }
                    }
                }?;
                values.push((field.name, converted_value));
            }
            record.new_val(values)
        }
        Type::Variant(variant) => {
            // t.struct({tag, value}) => variant { tag1(p1?), tag2(p2?), .. }
            let tmp = serde_json::Value::Object(object.to_owned());
            let repr: WitVariant = serde_json::from_value(tmp)?;
            let canon_tags = variant
                .cases()
                .map(|c| c.name.to_owned())
                .collect::<Vec<_>>();
            let result = variant
                .cases()
                .find_map(|c| if c.name == repr.tag { Some(c) } else { None });
            match result {
                Some(matching_tag) => match matching_tag.ty {
                    Some(payload_ty) => {
                        if repr.value == serde_json::Value::Null {
                            bail!(
                                "variant '{}' expects a payload, none was provided",
                                matching_tag.name
                            )
                        }
                        let payload = value_to_wasmtime_val(&repr.value, &payload_ty)?;
                        variant.new_val(matching_tag.name, Some(payload))
                    }
                    None => {
                        if repr.value != serde_json::Value::Null {
                            bail!("variant '{}' expects no payload", matching_tag.name)
                        }
                        variant.new_val(matching_tag.name, None)
                    }
                },
                None => bail!("none of [{}] match '{}'", canon_tags.join(", "), repr.tag),
            }
        }
        _ => bail!(
            "cannot coerce '{}' to {:?}",
            serde_json::to_string(object)?,
            canonical_ty
        ),
    }
}

/// Convert json array to a wit `list`, `tuple` or `flags`
pub fn array_to_wasmtime_val(
    array: &[serde_json::Value],
    canonical_ty: &component::Type,
) -> anyhow::Result<component::Val> {
    match canonical_ty {
        Type::List(list) => {
            let hint_ty = list.ty();
            let converted = array
                .iter()
                .map(|value| value_to_wasmtime_val(value, &hint_ty))
                .collect::<anyhow::Result<Vec<_>>>()?;
            list.new_val(converted.into())
        }
        Type::Tuple(tuple) => {
            let canonical_len = tuple.types().len();
            let provided_len = array.len();
            if canonical_len != provided_len {
                bail!(
                    "value of size {provided_len} cannot fit inside tuple of size {canonical_len}"
                );
            }
            let converted = tuple
                .types()
                .enumerate()
                .map(|(pos, hint_ty)| value_to_wasmtime_val(array.get(pos).unwrap(), &hint_ty))
                .collect::<anyhow::Result<Vec<_>>>()?;
            tuple.new_val(converted.into())
        }
        Type::Flags(flags) => {
            let given_names = array
                .iter()
                .map(|it| serde_json::from_value::<String>(it.clone()).map_err(|e| e.into()))
                .collect::<anyhow::Result<HashSet<String>>>()?;
            let canon_names = flags.names().map(|n| n.to_owned()).collect::<HashSet<_>>();
            let not_included = &given_names - &canon_names;
            if !not_included.is_empty() {
                let invalid = Vec::from_iter(not_included);
                let prop = Vec::from_iter(canon_names);
                bail!(
                    "none of [{}] match any of [{}]",
                    invalid.join(", "),
                    prop.join(", ")
                );
            }

            let conv_ordered = flags
                .names()
                .filter(|name| given_names.contains(*name))
                .collect::<Vec<_>>();
            flags.new_val(&conv_ordered)
        }
        _ => bail!(
            "cannot coerce '{}' to {:?}",
            serde_json::to_string(array)?,
            canonical_ty
        ),
    }
}

/// Convert any json value to component Val
pub fn value_to_wasmtime_val(
    value: &'_ serde_json::Value,
    canonical_ty: &component::Type,
) -> anyhow::Result<component::Val> {
    use serde_json::Value::*;
    if let Type::Option(option) = canonical_ty {
        return match value {
            Null => option.new_val(None),
            _ => {
                let converted = value_to_wasmtime_val(value, &option.ty())?;
                option.new_val(Some(converted))
            }
        };
    }

    let p = match value {
        Bool(v) => component::Val::Bool(*v),
        Number(v) => {
            match canonical_ty {
                Type::Bool => component::Val::Bool(v.as_u64().unwrap() != 0),
                // signed
                Type::S8 => component::Val::S8(v.as_i64().unwrap() as i8),
                Type::S16 => component::Val::S16(v.as_i64().unwrap() as i16),
                Type::S32 => component::Val::S32(v.as_i64().unwrap() as i32),
                Type::S64 => component::Val::S64(v.as_i64().unwrap()),
                // unsigned
                Type::Char => component::Val::Char((v.as_u64().unwrap() & 0xff) as u8 as char),
                Type::U8 => component::Val::U8(v.as_u64().unwrap() as u8),
                Type::U16 => component::Val::U16(v.as_u64().unwrap() as u16),
                Type::U32 => component::Val::U32(v.as_u64().unwrap() as u32),
                Type::U64 => component::Val::U64(v.as_u64().unwrap()),
                // float
                Type::Float32 => component::Val::Float32(v.as_f64().unwrap() as f32),
                // Type::Float64 => component::Val::Float64(v.as_f64().unwrap()),
                // still coerce?
                // Type::String => todo!(),
                _ => component::Val::Float64(v.as_f64().unwrap()),
            }
        }
        String(value) => match canonical_ty {
            Type::Char => value
                .chars()
                .next()
                .map(component::Val::Char)
                .context(format!("cannot coerce string '{value}' to a char"))?,
            Type::String => component::Val::String(value.to_owned().into()),
            Type::Enum(enum_ty) => {
                if !enum_ty.names().any(|v| v == value) {
                    let prop = enum_ty.names().map(|v| v.to_owned()).collect::<Vec<_>>();
                    bail!("expected one of {}, received '{}'", prop.join(", "), value);
                }
                enum_ty.new_val(value)?
            }
            // IDEA: coercing a string to object implies deserialization, this enables t.json()
            // Type::Record => todo!(),
            _ => bail!("cannot coerce '{}' to {:?}", value, canonical_ty),
        },
        Array(values) => array_to_wasmtime_val(values, canonical_ty)?,
        Object(object) => object_to_wasmtime_val(object, canonical_ty)?,
        Null => {
            bail!("cannot coerce null value to {:?}", canonical_ty)
        }
    };
    Ok(p)
}

pub fn wasmtime_val_to_value(value: &component::Val) -> anyhow::Result<serde_json::Value> {
    match value {
        Val::Bool(value) => serde_json::to_value(value),
        Val::S8(value) => serde_json::to_value(value),
        Val::U8(value) => serde_json::to_value(value),
        Val::S16(value) => serde_json::to_value(value),
        Val::U16(value) => serde_json::to_value(value),
        Val::S32(value) => serde_json::to_value(value),
        Val::U32(value) => serde_json::to_value(value),
        Val::S64(value) => serde_json::to_value(value),
        Val::U64(value) => serde_json::to_value(value),
        Val::Float32(value) => serde_json::to_value(value),
        Val::Float64(value) => serde_json::to_value(value),
        Val::Char(value) => serde_json::to_value(value),
        Val::String(value) => serde_json::to_value(value),
        // error-like
        Val::Result(value) => {
            let ret = match value.value() {
                Ok(payload) => wasmtime_val_to_value(payload.unwrap())?,
                Err(payload) => {
                    bail!("{:?}", wasmtime_val_to_value(payload.unwrap())?)
                }
            };
            Ok(ret)
        }
        Val::Option(value) => {
            let ret = match value.value() {
                Some(payload) => wasmtime_val_to_value(payload)?,
                None => serde_json::value::Value::Null,
            };
            Ok(ret)
        }
        // array-like
        Val::List(list) => {
            let out = list
                .to_vec()
                .iter()
                .map(wasmtime_val_to_value)
                .collect::<anyhow::Result<serde_json::Value>>()?;
            Ok(out)
        }
        Val::Tuple(items) => {
            let out = items
                .values()
                .iter()
                .map(wasmtime_val_to_value)
                .collect::<anyhow::Result<serde_json::Value>>()?;
            Ok(out)
        }
        // object-like
        Val::Record(value) => {
            let mut record = serde_json::Map::new();
            for (k, v) in value.fields() {
                record.insert(k.to_string(), wasmtime_val_to_value(v)?);
            }
            serde_json::to_value(record)
        }
        Val::Variant(value) => {
            let tag = value.discriminant();
            let value = match value.payload() {
                Some(payload) => wasmtime_val_to_value(payload)?,
                None => serde_json::Value::Null,
            };
            serde_json::to_value(WitVariant {
                tag: tag.to_string(),
                value,
            })
        }
        Val::Enum(value) => {
            let value = value.discriminant();
            serde_json::to_value(value)
        }
        Val::Flags(flags) => serde_json::to_value(flags.flags().collect::<Vec<&str>>()),
        _ => {
            bail!("cannot convert unsupported value of type {:?}", value.ty())
        }
    }
    .map_err(|e| e.into())
}
