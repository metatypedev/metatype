// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::Write;

use super::manifest::{ManifestEntry, ManifestPage};
use super::shared::types::type_body_required;
use super::utils::{normalize_struct_prop_name, normalize_type_title};
use crate::interlude::*;

pub type TsTypesPage = ManifestPage<TsType>;

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

    fn build_string(ty: &Arc<StringType>, name: String) -> TsType {
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

    fn build_optional(ty: &Arc<OptionalType>, name: String) -> TsType {
        let item_ty = ty.item();
        let explicit_alias = ty.default_value.is_some() || !ty.title().starts_with("optional_");
        TsType::Alias {
            alias: Alias::Optional(item_ty.key()),
            name: explicit_alias.then_some(name),
        }
    }

    fn build_list(ty: &Arc<ListType>, name: String) -> TsType {
        let explicit_alias = !matches!((ty.max_items, ty.min_items), (None, None))
            || !ty.title().starts_with("list_");
        let name = explicit_alias.then_some(name);

        TsType::Alias {
            alias: Alias::Container {
                name: "Array",
                item: ty.item().key(),
            },
            name,
        }
    }

    fn build_object(ty: &Arc<ObjectType>, name: String) -> TsType {
        let props = ty
            .properties()
            .iter()
            .filter(|(_, prop)| !prop.is_injected())
            .map(|(name, prop)| {
                let ty = prop.ty.key();
                let optional = matches!(prop.ty, Type::Optional(_));
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

    fn build_union(ty: &Arc<UnionType>, name: String) -> TsType {
        let variants = ty
            .variants()
            .iter()
            .map(|variant| variant.key())
            .collect::<Vec<_>>();
        TsType::Enum { name, variants }
    }
}

#[derive(Debug)]
pub struct ObjectProp {
    name: String,
    ty: TypeKey,
    optional: bool,
}

impl ManifestEntry for TsType {
    type Extras = ();

    fn render(&self, out: &mut impl Write, page: &TsTypesPage) -> std::fmt::Result {
        match self {
            TsType::Alias { name, alias } => {
                if let Some(name) = name {
                    match alias {
                        Alias::BuiltIn(target) => {
                            writeln!(out, "export type {name} = {target};")?;
                        }
                        Alias::Optional(inner) => {
                            let inner_name = page.get_ref(inner).unwrap();
                            writeln!(
                                out,
                                "export type {name} = ({inner_name}) | null | undefined;"
                            )?;
                        }
                        Alias::Container {
                            name: container,
                            item,
                        } => {
                            let item_name = page.get_ref(item).unwrap();
                            writeln!(out, "export type {name} = {container}<{item_name}>;")?;
                        }
                    }
                }
            }
            TsType::Object { name, properties } => {
                writeln!(out, "export type {name} = {{")?;
                for prop in properties {
                    let prop_name = &prop.name;
                    let prop_ty = page.get_ref(&prop.ty).unwrap();
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
                    let variant_name = page.get_ref(variant).unwrap();
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

    fn get_reference_expr(&self, page: &TsTypesPage) -> Option<String> {
        match self {
            TsType::Alias { name, alias } => {
                if let Some(name) = name {
                    Some(name.clone())
                } else {
                    match alias {
                        Alias::BuiltIn(target) => Some(target.to_string()),
                        Alias::Optional(inner) => {
                            let inner_name = page.get_ref(inner).unwrap();
                            Some(format!("({inner_name}) | null | undefined"))
                        }
                        Alias::Container {
                            name: container,
                            item,
                        } => {
                            let item_name = page.get_ref(item).unwrap();
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

impl From<&Type> for TsType {
    fn from(ty: &Type) -> Self {
        if type_body_required(ty) {
            let name = normalize_type_title(&ty.name());
            match ty {
                Type::Boolean(_) => TsType::builtin("boolean", Some(name)),
                Type::Integer(_) => TsType::builtin("number", Some(name)),
                Type::Float(_) => TsType::builtin("number", Some(name)),
                Type::String(ty) => Self::build_string(ty, name),
                Type::File(_) => TsType::builtin("File", Some(name)),
                Type::Optional(ty) => Self::build_optional(ty, name),
                Type::List(ty) => Self::build_list(ty, name),
                Type::Object(ty) => Self::build_object(ty, name),
                Type::Union(ty) => Self::build_union(ty, name),

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
}

impl TsTypesPage {
    pub fn new(tg: &Typegraph) -> Self {
        let mut map = IndexMap::new();

        for (key, ty) in tg.input_types.iter() {
            if let Type::Object(ty) = ty {
                if ty.properties().is_empty() {
                    continue;
                }
            }
            map.insert(*key, ty.into());
        }

        for (key, ty) in tg.output_types.iter() {
            map.insert(*key, ty.into());
        }

        map.into()
    }
}
