// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use anyhow::bail;
use mt_deno::deno::deno_runtime::deno_core::serde_json::{self, json};
use wasmtime::component::{self, Type, Val};

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
            let list = component::List::new(list_ty, vec![].into())?;
            Val::List(list)
        }
        Type::Option(option_ty) => {
            let content = unlift_type_to_default_value(&option_ty.ty())?;
            let option = component::OptionVal::new(option_ty, Some(content))?;
            Val::Option(option)
        }
        Type::Result(result_ty) => {
            let content = match result_ty.ok() {
                Some(ok_ty) => Ok(Some(unlift_type_to_default_value(&ok_ty)?)),
                None => {
                    let err_ty = result_ty.err().unwrap();
                    Err(Some(unlift_type_to_default_value(&err_ty)?))
                }
            };
            let result = component::ResultVal::new(result_ty, content)?;
            Val::Result(result)
        }
        Type::Tuple(tuple_ty) => {
            // tuple<t1, t2, ..>
            let out = tuple_ty
                .types()
                .map(|ty| unlift_type_to_default_value(&ty))
                .collect::<anyhow::Result<Vec<_>>>()?;
            let tuple = component::Tuple::new(tuple_ty, out.into())?;
            Val::Tuple(tuple)
        }
        Type::Enum(enum_ty) => {
            // enum my-enum { a, b, c, .. }
            let names = enum_ty.names().collect::<Vec<_>>();
            if names.is_empty() {
                bail!("invalid state: enum {:?} has no variant", ty);
            }
            let enum_ = component::Enum::new(enum_ty, names.first().unwrap())?;
            Val::Enum(enum_)
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
            let variant = component::Variant::new(variant_ty, first_case.name, first_payload)?;
            Val::Variant(variant)
        }
        Type::Record(record_ty) => {
            // record some-rec { a: string, b: c, d: u8, .. }
            let values = record_ty
                .fields()
                .map(|f| unlift_type_to_default_value(&f.ty).map(|val| (f.name, val)))
                .collect::<anyhow::Result<Vec<(_, _)>>>()?;
            let record = component::Record::new(record_ty, values)?;
            Val::Record(record)
        }
        Type::Flags(_) | Type::Own(_) | Type::Borrow(_) => {
            // TODO: research
            bail!("{:?} is currently not supported", ty)
        }
    };
    Ok(ret)
}

pub fn value_to_wasmtime_val(
    value: &'_ serde_json::Value,
    coerce_hint: Option<component::Type>,
) -> anyhow::Result<component::Val> {
    use serde_json::Value::*;
    let p = match value {
        Bool(v) => component::Val::Bool(*v),
        Number(v) => {
            let default_ret = component::Val::Float64(v.as_f64().unwrap());
            match coerce_hint {
                Some(hint) => match hint {
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
                    _ => default_ret,
                },
                None => default_ret,
            }
        }
        String(v) => {
            let mut default_ret = component::Val::String(v.to_owned().into());
            if let Some(Type::Char) = coerce_hint {
                default_ret = v
                    .chars()
                    .next()
                    .map(component::Val::Char)
                    .unwrap_or(default_ret);
            }
            default_ret
        }
        Array(_values) => {
            // FIXME: component::Val::List(List(* is private, ..))
            // TODO: coerce to a tuple if the provided hint is a tuple once a
            // fix is found
            // let values = values
            //     .iter()
            //     .map(|v| value_to_wasmtime_val(v, None))
            //     .collect::<anyhow::Result<Vec<_>>>()?;
            // // let val = types::List::new_val(values);
            // let default_ret = component::Val::List(vec![].into());
            bail!("array not supported yet")
        }
        Null => {
            // FIXME: component::Val::Optional(OptionVal(* is private, ..))
            bail!("null not supported yet")
        }
        Object(_) => bail!("object not supported yet"),
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
            Ok(json!({
                "tag": tag,
                "value": value
            }))
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
