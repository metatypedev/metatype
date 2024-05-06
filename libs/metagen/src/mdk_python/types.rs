use anyhow::bail;
use garde::external::compact_str::CompactStringExt;
use heck::ToPascalCase;

use crate::interlude::*;

/// Collect relevant definitions in `memo` if object, return the type in Python
pub fn visit_type(
    tera: &tera::Tera,
    memo: &mut IndexMap<String, String>,
    tpe: &TypeNode,
    tg: &Typegraph,
) -> anyhow::Result<String> {
    let ret = match tpe {
        TypeNode::Boolean { .. } => "bool".to_string(),
        TypeNode::Float { .. } => "float".to_string(),
        TypeNode::Integer { .. } => "int".to_string(),
        TypeNode::String { .. } => "str".to_string(),
        TypeNode::Object { .. } => visit_object(tera, memo, tpe, tg)?,
        TypeNode::Optional { data, .. } => {
            let item = &tg.types[data.item.clone() as usize];
            let item = visit_type(tera, memo, item, tg)?;
            format!("Optional[{item}]")
        }
        TypeNode::List { data, .. } => {
            let item = &tg.types[data.items.clone() as usize];
            let item = visit_type(tera, memo, item, tg)?;
            format!("List[{item}]")
        }
        TypeNode::Function { .. } => "".to_string(),
        TypeNode::Union { .. } | TypeNode::Either { .. } => {
            visit_union_or_either(tera, memo, tpe, tg)?
        }
        _ => bail!("Unsupported type {:?}", tpe.type_name()),
    };
    Ok(ret)
}

/// Collect relevant definitions in `memo`, return the type in Python
pub fn visit_object(
    tera: &tera::Tera,
    memo: &mut IndexMap<String, String>,
    tpe: &TypeNode,
    tg: &Typegraph,
) -> anyhow::Result<String> {
    if let TypeNode::Object { base, data } = tpe {
        let mut fields_repr = vec![];
        for (field, idx) in data.properties.iter() {
            let field_tpe = &tg.types[idx.clone() as usize];
            let type_repr = visit_type(tera, memo, field_tpe, tg)?;
            fields_repr.push(format!("{field}: {type_repr}"));
        }

        let mut context = tera::Context::new();
        context.insert("class_name", &base.title.to_pascal_case());
        context.insert("fields", &fields_repr);

        let code = tera.render("struct_template", &context)?;
        memo.insert(base.title.clone(), code.clone());
        Ok(base.title.clone().to_pascal_case())
    } else {
        panic!("object node was expected, got {:?}", tpe.type_name())
    }
}

/// Collect relevant definitions in `memo`, return the type in Python
pub fn visit_union_or_either(
    tera: &tera::Tera,
    memo: &mut IndexMap<String, String>,
    tpe: &TypeNode,
    tg: &Typegraph,
) -> anyhow::Result<String> {
    if let TypeNode::Union { data, .. } = tpe {
        let mut variants_repr = HashSet::new();
        for idx in data.any_of.iter() {
            let field_tpe = &tg.types[idx.clone() as usize];
            let type_repr = visit_type(tera, memo, field_tpe, tg)?;
            variants_repr.insert(format!("{type_repr}"));
        }
        let variant_repr = variants_repr.join_compact(", ").to_string();
        Ok(format!("Union[{variant_repr}]"))
    } else {
        panic!("union/either node was expected, got {:?}", tpe.type_name())
    }
}
