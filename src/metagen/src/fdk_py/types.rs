// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use garde::external::compact_str::CompactStringExt;
use heck::ToPascalCase;
use typegraph::TypeNode as _;

use crate::interlude::*;

use super::utils::{Memo, TypeGenerated};
use super::STRUCT_TEMPLATE;

/// Collect relevant definitions in `memo` if object, return the type in Python
pub fn visit_type(
    tera: &tera::Tera,
    memo: &mut Memo,
    tpe: &Type,
    tg: &Typegraph,
) -> anyhow::Result<TypeGenerated> {
    memo.incr_weight();

    let hint = match tpe {
        Type::Boolean(_) => "bool".to_string(),
        Type::Float(_) => "float".to_string(),
        Type::Integer(_) => "int".to_string(),
        Type::String(_) => "str".to_string(),
        Type::Object(_) => {
            let class_hint = tpe.base().title.to_pascal_case();
            let hint = match memo.is_allocated(&class_hint) {
                true => class_hint,
                false => visit_object(tera, memo, tpe, tg)?.hint,
            };
            format!("\"{hint}\"")
        }
        Type::Optional(ty) => {
            let item_hint = visit_type(tera, memo, ty.item()?, tg)?.hint;
            format!("Union[{item_hint}, None]")
        }
        Type::List(ty) => {
            let item_hint = visit_type(tera, memo, ty.item()?, tg)?.hint;
            format!("List[{item_hint}]")
        }
        Type::Function(_) => "".to_string(),
        Type::Union(_) => visit_union(tera, memo, tpe, tg)?.hint,
        // TODO: base64
        Type::File { .. } => "str".to_string(),
        // Type::Any { .. } => "Any".to_string(),
    };

    memo.decr_weight();
    Ok(hint.into())
}

/// Collect relevant definitions in `memo`, return the type in Python
fn visit_object(
    tera: &tera::Tera,
    memo: &mut Memo,
    tpe: &Type,
    tg: &Typegraph,
) -> anyhow::Result<TypeGenerated> {
    if let Type::Object(ty) = tpe {
        let mut fields_repr = vec![];
        let hint = ty.base().title.clone().to_pascal_case();

        memo.allocate(hint.clone());

        for (name, prop) in ty.properties()?.iter() {
            let type_repr = visit_type(tera, memo, &prop.type_, tg)?.hint;
            fields_repr.push(format!("{name}: {type_repr}"));
        }

        let mut context = tera::Context::new();
        context.insert("class_name", &ty.base().title.to_pascal_case()); // TODO hint??
        context.insert("fields", &fields_repr);

        let code = tera.render(STRUCT_TEMPLATE, &context)?;
        let generated = TypeGenerated {
            hint: hint.clone(),
            def: Some(code),
        };

        memo.insert(hint, generated.clone());

        Ok(generated)
    } else {
        panic!("object node was expected, got {:?}", tpe.tag())
    }
}

/// Collect relevant definitions in `memo`, return the type in Python
fn visit_union(
    tera: &tera::Tera,
    memo: &mut Memo,
    tpe: &Type,
    tg: &Typegraph,
) -> anyhow::Result<TypeGenerated> {
    if let Type::Union(ty) = tpe {
        let variants = ty.variants()?;
        let mut variants_repr = std::collections::BTreeSet::new();
        for ty in variants.iter() {
            let type_repr = visit_type(tera, memo, ty, tg)?.hint;
            variants_repr.insert(type_repr);
        }
        let variant_hints = variants_repr.join_compact(", ").to_string();
        let hint = match variants_repr.len() == 1 {
            true => variant_hints,
            false => format!("Union[{variant_hints}]"),
        };
        Ok(hint.into())
    } else {
        panic!("union/either node was expected, got {:?}", tpe.tag())
    }
}
