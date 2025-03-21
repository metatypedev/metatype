// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::Write;

use super::manifest::{ManifestPage, TypeRenderer};
use super::shared::types::type_body_required;
use super::utils::{normalize_struct_prop_name, normalize_type_title};
use crate::interlude::*;

#[derive(Debug)]
pub enum Alias {
    BuiltIn(&'static str),
    Optional(TypeKey),
    Container { name: &'static str, item: TypeKey },
}

#[derive(Debug)]
pub enum TsType {
    Alias {
        alias: Alias,
        /// inlined if name is none
        name: Option<String>,
    },
    Object {
        name: String,
        properties: Vec<ObjectProp>,
    },
    Enum {
        name: String,
        variants: Vec<TypeKey>,
    },
    LiteralEnum {
        name: String,
        variants: Vec<String>,
    },
}

impl TsType {
    fn builtin(target: &'static str, name: Option<String>) -> Self {
        Self::Alias {
            alias: Alias::BuiltIn(target),
            name,
        }
    }
}

#[derive(Debug)]
pub struct ObjectProp {
    name: String,
    ty: TypeKey,
    optional: bool,
}

impl TypeRenderer for TsType {
    type Context = ();
    fn render(
        &self,
        out: &mut impl Write,
        page: &ManifestPage<Self>,
        ctx: &Self::Context,
    ) -> std::fmt::Result {
        match self {
            TsType::Alias { name, alias } => {
                if let Some(name) = name {
                    match alias {
                        Alias::BuiltIn(target) => {
                            writeln!(out, "export type {name} = {target};")?;
                        }
                        Alias::Optional(inner) => {
                            let inner_name = page.get_ref(inner, ctx).unwrap();
                            writeln!(
                                out,
                                "export type {name} = ({inner_name}) | null | undefined;"
                            )?;
                        }
                        Alias::Container {
                            name: container,
                            item,
                        } => {
                            let item_name = page.get_ref(item, ctx).unwrap();
                            writeln!(out, "export type {name} = {container}<{item_name}>;")?;
                        }
                    }
                }
            }
            TsType::Object { name, properties } => {
                writeln!(out, "export type {name} = {{")?;
                for prop in properties {
                    let prop_name = &prop.name;
                    let prop_ty = page.get_ref(&prop.ty, ctx).unwrap();
                    if prop.optional {
                        writeln!(out, "  {prop_name}?: {prop_ty};")?;
                    } else {
                        writeln!(out, "  {prop_name}: {prop_ty};")?;
                    }
                }
                writeln!(out, "}};")?;
            }
            TsType::Enum { name, variants } => {
                write!(out, "export type {name} =")?;
                for variant in variants {
                    let variant_name = page.get_ref(variant, ctx).unwrap();
                    write!(out, "\n  | ({variant_name})")?;
                }
                writeln!(out, ";")?;
            }
            TsType::LiteralEnum { name, variants } => {
                writeln!(out, "export type {name} =")?;
                for variant in variants {
                    write!(out, "\n  | {variant}")?;
                }
                writeln!(out, ";")?;
            }
        }

        Ok(())
    }

    fn get_reference_expr(&self, page: &ManifestPage<Self>, ctx: &()) -> Option<String> {
        match self {
            TsType::Alias { name, alias } => {
                if let Some(name) = name {
                    Some(name.clone())
                } else {
                    match alias {
                        Alias::BuiltIn(target) => Some(target.to_string()),
                        Alias::Optional(inner) => {
                            let inner_name = page.get_ref(inner, ctx).unwrap();
                            Some(format!("({inner_name}) | null | undefined"))
                        }
                        Alias::Container {
                            name: container,
                            item,
                        } => {
                            let item_name = page.get_ref(item, ctx).unwrap();
                            Some(format!("{container}<{item_name}>"))
                        }
                    }
                }
            }
            TsType::Object { name, .. } => Some(name.clone()),
            TsType::Enum { name, .. } => Some(name.clone()),
            TsType::LiteralEnum { name, .. } => Some(name.clone()),
        }
    }
}

fn get_typespec(ty: &Type) -> TsType {
    if type_body_required(ty) {
        let name = normalize_type_title(&ty.name());
        match ty {
            Type::Boolean(_) => TsType::builtin("boolean", Some(name)),
            Type::Integer(_) => TsType::builtin("number", Some(name)),
            Type::Float(_) => TsType::builtin("number", Some(name)),
            Type::String(ty) => {
                if let Some(variants) = &ty.enumeration {
                    TsType::LiteralEnum {
                        name,
                        variants: variants.clone(),
                    }
                } else if let Some(format) = ty.format_only() {
                    let ty_name = normalize_type_title(&format!("string_{format}_{}", ty.idx()));
                    TsType::builtin("string", Some(ty_name))
                } else {
                    TsType::builtin("string", Some(name))
                }
            }
            Type::File(_) => TsType::builtin("File", Some(name)),
            Type::Optional(ty) => {
                let item_ty = ty.item();
                if ty.default_value.is_none() && ty.title().starts_with("optional_") {
                    TsType::Alias {
                        alias: Alias::Optional(item_ty.key()),
                        name: None,
                    }
                } else {
                    TsType::Alias {
                        alias: Alias::Optional(item_ty.key()),
                        name: Some(name),
                    }
                }
            }
            Type::List(ty) => {
                let item_ty = ty.item();
                if matches!((ty.max_items, ty.min_items), (None, None))
                    && ty.title().starts_with("list_")
                {
                    TsType::Alias {
                        alias: Alias::Container {
                            name: "Array",
                            item: item_ty.key(),
                        },
                        name: None,
                    }
                } else {
                    TsType::Alias {
                        alias: Alias::Container {
                            name: "Array",
                            item: item_ty.key(),
                        },
                        name: Some(name),
                    }
                }
            }

            Type::Object(ty) => {
                let props = ty
                    .properties()
                    .iter()
                    .map(|(name, prop)| {
                        let ty = prop.type_.key();
                        let optional = matches!(prop.type_, Type::Optional(_));
                        ObjectProp {
                            name: normalize_struct_prop_name(&name[..]),
                            ty,
                            optional,
                        }
                    })
                    .collect::<Vec<_>>();
                TsType::Object {
                    name,
                    properties: props,
                }
            }

            Type::Union(ty) => {
                let variants = ty
                    .variants()
                    .iter()
                    .map(|variant| variant.key())
                    .collect::<Vec<_>>();
                TsType::Enum { name, variants }
            }

            Type::Function(_) => unreachable!("unexpected function type"),
        }
    } else {
        TsType::builtin(
            match ty {
                Type::Boolean(_) => "boolean",
                Type::Integer(_) | Type::Float(_) => "number",
                Type::String(_) => "string",
                Type::File(_) => "File",
                _ => unreachable!("unexpected non-composite type: {:?}", ty.tag()),
            },
            None,
        )
    }
}

pub fn manifest_page(tg: &Typegraph) -> Result<ManifestPage<TsType>> {
    let mut map = IndexMap::new();

    for (key, ty) in tg.input_types.iter() {
        if let Type::Object(ty) = ty {
            if ty.properties().is_empty() {
                continue;
            }
        }
        let typespec = get_typespec(ty);
        map.insert(*key, typespec);
    }

    for (key, ty) in tg.output_types.iter() {
        let typespec = get_typespec(ty);
        map.insert(*key, typespec);
    }

    let res: ManifestPage<TsType> = map.into();
    Ok(res)
}
