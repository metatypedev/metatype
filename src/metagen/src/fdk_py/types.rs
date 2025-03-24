// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{borrow::Cow, fmt::Write};

use crate::interlude::*;
use indexmap::IndexMap;

use super::{
    fdk_rs::utils::{normalize_struct_prop_name, normalize_type_title},
    manifest::{ManifestEntry, ManifestPage},
    shared::types::type_body_required,
};

#[derive(Debug)]
pub enum AliasTarget {
    BuiltIn(&'static str),
    Type(TypeKey),
}

#[derive(Debug)]
pub struct Alias {
    name: Option<String>,
    target: AliasTarget,
    container: Option<&'static str>,
    quote: bool,
}

impl From<AliasTarget> for Alias {
    fn from(target: AliasTarget) -> Self {
        Alias {
            name: None,
            target,
            container: None,
            quote: false,
        }
    }
}

impl Alias {
    pub fn named(self, name: String) -> Self {
        Alias {
            name: Some(name),
            ..self
        }
    }

    pub fn container(self, container: &'static str) -> Self {
        Alias {
            container: Some(container),
            ..self
        }
    }

    pub fn quote(self) -> Self {
        Alias {
            quote: true,
            ..self
        }
    }
}

impl Alias {
    fn render(&self, dest: &mut impl Write, page: &PyTypesPage) -> std::fmt::Result {
        if let Some(alias_name) = &self.name {
            let aliased_ty = self.target_name(page, self.container);
            writeln!(dest, "{alias_name} = {aliased_ty}")?;
            writeln!(dest)?;
        }
        Ok(())
    }

    fn target_name(&self, page: &PyTypesPage, container: Option<&'static str>) -> String {
        let inner: Cow<'static, str> = match &self.target {
            AliasTarget::BuiltIn(builtin) => (*builtin).into(), //
            AliasTarget::Type(ty_key) => page.get_ref(ty_key).unwrap().into(),
        };
        if let Some(container) = container {
            if self.quote {
                format!(
                    "typing.{container}[{inner}]",
                    inner = quote_ty_name(inner.into_owned())
                )
            } else {
                format!("typing.{container}[{inner}]")
            }
        } else {
            inner.into_owned()
        }
    }
}

#[derive(Debug)]
struct ObjectProperty {
    name: String,
    ty: TypeKey,
    optional: bool,
    quoted: bool,
}

#[derive(Debug)]
pub struct Object {
    name: String,
    props: Vec<ObjectProperty>,
}

impl Object {
    fn render(&self, dest: &mut impl Write, page: &PyTypesPage) -> std::fmt::Result {
        let name = &self.name;
        writeln!(dest, r#"{name} = typing.TypedDict("{name}", {{"#)?;
        for prop in self.props.iter() {
            let ty_ref = page.get_ref(&prop.ty).unwrap();
            let ty_ref = if prop.quoted {
                quote_ty_name(ty_ref)
            } else {
                ty_ref
            };
            let prop_key = &prop.name;
            // FIXME: NotRequired is only avail on python 3.11
            if prop.optional {
                // writeln!(dest, r#"    "{name}": typing.NotRequired[{ty_name}],"#)?;
                writeln!(dest, r#"    "{prop_key}": {ty_ref},"#)?;
            } else {
                writeln!(dest, r#"    "{prop_key}": {ty_ref},"#)?;
            }
        }
        // FIXME: all fields are optional due to py 3.9 TypedDict limitations
        writeln!(dest, "}}, total=False)")?;
        writeln!(dest)?;
        Ok(())
    }
}

fn render_union(
    dest: &mut impl Write,
    name: &str,
    variants: impl Iterator<Item = String>,
) -> std::fmt::Result {
    writeln!(dest, "{name} = typing.Union[")?;
    for variant in variants {
        writeln!(dest, "    {variant},")?;
    }
    writeln!(dest, "]")?;
    writeln!(dest)?;
    Ok(())
}

#[derive(Debug)]
pub struct LiteralEnum {
    name: String,
    variants: Vec<String>,
}

impl LiteralEnum {
    fn render(&self, dest: &mut impl Write) -> std::fmt::Result {
        render_union(
            dest,
            &self.name,
            self.variants.iter().map(|v| format!("typing.Literal[{v}]")),
        )
    }
}

#[derive(Debug)]
pub struct Union {
    name: String,
    variants: Vec<TypeKey>,
}

impl Union {
    fn render(&self, dest: &mut impl Write, page: &PyTypesPage) -> std::fmt::Result {
        render_union(
            dest,
            &self.name,
            self.variants.iter().map(|v| page.get_ref(v).unwrap()),
        )
    }
}

fn quote_ty_name(name: String) -> String {
    if !name.starts_with('"') {
        format!("\"{name}\"")
    } else {
        name
    }
}

#[derive(Debug)]
pub enum PyType {
    Alias(Alias),
    LiteralEnum(LiteralEnum),
    Object(Object),
    Union(Union),
}

pub type PyTypesPage = ManifestPage<PyType>;

impl ManifestEntry for PyType {
    type Extras = ();

    fn render(
        &self,
        out: &mut impl Write,
        page: &ManifestPage<Self, Self::Extras>,
    ) -> std::fmt::Result {
        match self {
            PyType::Alias(alias) => alias.render(out, page),
            PyType::LiteralEnum(literal_enum) => literal_enum.render(out),
            PyType::Object(object) => object.render(out, page),
            PyType::Union(union) => union.render(out, page),
        }
    }

    fn get_reference_expr(&self, page: &ManifestPage<Self, Self::Extras>) -> Option<String> {
        match self {
            PyType::Alias(alias) => Some(if let Some(name) = &alias.name {
                name.clone()
            } else {
                alias.target_name(page, alias.container)
            }),
            PyType::LiteralEnum(literal_enum) => Some(literal_enum.name.clone()),
            PyType::Object(object) => Some(object.name.clone()),
            PyType::Union(union) => Some(union.name.clone()),
        }
    }
}

impl From<&Type> for PyType {
    fn from(ty: &Type) -> Self {
        let alias_required = type_body_required(ty);
        match ty {
            Type::Function(_) => unreachable!(),
            Type::Boolean(ty) if alias_required => {
                let ty_name = normalize_type_title(&ty.name());
                PyType::Alias(Alias::from(AliasTarget::BuiltIn("bool")).named(ty_name))
            }
            Type::Boolean(_) => PyType::Alias(AliasTarget::BuiltIn("bool").into()),
            Type::Float(ty) if alias_required => {
                let ty_name = normalize_type_title(&ty.name());
                PyType::Alias(Alias::from(AliasTarget::BuiltIn("float")).named(ty_name))
            }
            Type::Float(_) => PyType::Alias(AliasTarget::BuiltIn("float").into()),
            Type::Integer(ty) if alias_required => {
                let ty_name = normalize_type_title(&ty.name());
                PyType::Alias(Alias::from(AliasTarget::BuiltIn("int")).named(ty_name))
            }
            Type::Integer(_) => PyType::Alias(AliasTarget::BuiltIn("int").into()),
            Type::String(ty) => {
                if let (true, Some(enum_variants)) = (alias_required, &ty.enumeration) {
                    let ty_name = normalize_type_title(&ty.name());
                    return PyType::LiteralEnum(LiteralEnum {
                        name: ty_name,
                        variants: enum_variants.iter().map(|v| v.to_string()).collect(),
                    });
                }
                if let (Some(format), true) = (ty.format_only(), ty.title().starts_with("string_"))
                {
                    let ty_name = normalize_type_title(&format!("string_{format}_{}", ty.idx()));
                    return PyType::Alias(Alias::from(AliasTarget::BuiltIn("str")).named(ty_name));
                }
                if alias_required {
                    let ty_name = normalize_type_title(&ty.name());
                    PyType::Alias(Alias::from(AliasTarget::BuiltIn("str")).named(ty_name))
                } else {
                    PyType::Alias(AliasTarget::BuiltIn("str").into())
                }
            }
            Type::File(ty) if alias_required => {
                let ty_name = normalize_type_title(&ty.name());
                PyType::Alias(Alias::from(AliasTarget::BuiltIn("bytes")).named(ty_name))
            }
            Type::File(_) => PyType::Alias(AliasTarget::BuiltIn("bytes").into()),
            Type::Object(ty) => {
                let props = ty.properties().iter().map(|(name, prop)| {
                    let (optional, quoted) = match prop.ty {
                        Type::Optional(_) => (true, true),
                        _ => (false, ty.is_descendant_of(&prop.ty)),
                    };
                    ObjectProperty {
                        name: normalize_struct_prop_name(&name[..]),
                        ty: prop.ty.key(),
                        optional,
                        quoted,
                    }
                });
                PyType::Object(Object {
                    name: normalize_type_title(&ty.name()),
                    props: props.collect(),
                })
            }
            Type::Union(ty) => {
                let variants = ty.variants().iter().map(|v| v.key()).collect();
                PyType::Union(Union {
                    name: normalize_type_title(&ty.name()),
                    variants,
                })
            }
            Type::Optional(ty) if ty.title().starts_with("optional_") => {
                PyType::Alias(
                    Alias::from(AliasTarget::Type(ty.item().key()))
                        .container("Optional")
                        .quote(), // TODO handle cyclic case where entire cycle is aliases
                )
            }
            Type::Optional(ty) => PyType::Alias(
                Alias::from(AliasTarget::Type(ty.item().key()))
                    .named(normalize_type_title(&ty.name()))
                    .container("Optional")
                    .quote(), // TODO
            ),
            Type::List(ty)
                if matches!((&ty.min_items, &ty.max_items), (None, None))
                    && ty.name().starts_with("list_") =>
            {
                let container = if ty.unique_items { "Set" } else { "List" };
                PyType::Alias(
                    Alias::from(AliasTarget::Type(ty.item().key()))
                        .named(normalize_type_title(&ty.name()))
                        .container(container)
                        .quote(), // TODO
                )
            }
            Type::List(ty) => {
                PyType::Alias(
                    Alias::from(AliasTarget::Type(ty.item().key()))
                        .named(normalize_type_title(&ty.name()))
                        .container("List")
                        .quote(), // TODO
                )
            }
        }
    }
}

impl PyTypesPage {
    pub fn new(tg: &Typegraph) -> Self {
        let mut map = IndexMap::new();

        for (key, ty) in tg.input_types.iter() {
            map.insert(*key, PyType::from(ty));
        }
        for (key, ty) in tg.output_types.iter() {
            map.insert(*key, PyType::from(ty));
        }

        map.into()
    }
}
