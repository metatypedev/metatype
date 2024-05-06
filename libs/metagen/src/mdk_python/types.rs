// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::bail;
use garde::external::compact_str::CompactStringExt;
use heck::ToPascalCase;

use crate::interlude::*;

use super::utils::{Memo, TypeGenerated};

/// Collect relevant definitions in `memo` if object, return the type in Python
pub fn visit_type(
    tera: &tera::Tera,
    memo: &mut Memo,
    tpe: &TypeNode,
    tg: &Typegraph,
) -> anyhow::Result<TypeGenerated> {
    memo.incr_weight();

    let hint = match tpe {
        TypeNode::Boolean { .. } => "bool".to_string(),
        TypeNode::Float { .. } => "float".to_string(),
        TypeNode::Integer { .. } => "int".to_string(),
        TypeNode::String { .. } => "str".to_string(),
        TypeNode::Object { .. } => {
            let class_hint = tpe.base().title.to_pascal_case();
            let hint = match memo.is_allocated(&class_hint) {
                true => class_hint,
                false => visit_object(tera, memo, tpe, tg)?.hint,
            };
            format!("'{hint}'")
        }
        TypeNode::Optional { data, .. } => {
            let item = &tg.types[data.item as usize];
            let item_hint = visit_type(tera, memo, item, tg)?.hint;
            format!("Optional[{item_hint}]")
        }
        TypeNode::List { data, .. } => {
            let item = &tg.types[data.items as usize];
            let item_hint = visit_type(tera, memo, item, tg)?.hint;
            format!("List[{item_hint}]")
        }
        TypeNode::Function { .. } => "".to_string(),
        TypeNode::Union { .. } | TypeNode::Either { .. } => {
            visit_union_or_either(tera, memo, tpe, tg)?.hint
        }
        _ => bail!("Unsupported type {:?}", tpe.type_name()),
    };

    memo.decr_weight();
    Ok(hint.into())
}

/// Collect relevant definitions in `memo`, return the type in Python
fn visit_object(
    tera: &tera::Tera,
    memo: &mut Memo,
    tpe: &TypeNode,
    tg: &Typegraph,
) -> anyhow::Result<TypeGenerated> {
    if let TypeNode::Object { base, data } = tpe {
        let mut fields_repr = vec![];
        let hint = base.title.clone().to_pascal_case();

        memo.allocate(hint.clone());

        for (field, idx) in data.properties.iter() {
            let field_tpe = &tg.types[*idx as usize];
            if !memo.is_allocated(&field_tpe.base().title.to_pascal_case()) {
                let type_repr = visit_type(tera, memo, field_tpe, tg)?.hint;
                fields_repr.push(format!("{field}: {type_repr}"));
            }
        }

        let mut context = tera::Context::new();
        context.insert("class_name", &base.title.to_pascal_case());
        context.insert("fields", &fields_repr);

        let code = tera.render("struct_template", &context)?;
        let generated = TypeGenerated {
            hint: hint.clone(),
            def: Some(code),
        };

        memo.insert(hint, generated.clone());

        Ok(generated)
    } else {
        panic!("object node was expected, got {:?}", tpe.type_name())
    }
}

/// Collect relevant definitions in `memo`, return the type in Python
fn visit_union_or_either(
    tera: &tera::Tera,
    memo: &mut Memo,
    tpe: &TypeNode,
    tg: &Typegraph,
) -> anyhow::Result<TypeGenerated> {
    if let TypeNode::Union { data, .. } = tpe {
        let mut variants_repr = HashSet::new();
        for idx in data.any_of.iter() {
            let field_tpe = &tg.types[*idx as usize];
            let type_repr = visit_type(tera, memo, field_tpe, tg)?.hint;
            variants_repr.insert(type_repr);
        }
        let variant_hints = variants_repr.join_compact(", ").to_string();
        let hint = match variants_repr.len() == 1 {
            true => variant_hints,
            false => format!("Union[{variant_hints}]"),
        };
        Ok(hint.into())
    } else {
        panic!("union/either node was expected, got {:?}", tpe.type_name())
    }
}
