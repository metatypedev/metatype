// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::Write;

use tg_schema::*;

use super::utils::{normalize_struct_prop_name, normalize_type_title};
use crate::{interlude::*, shared::types::*};
use typegraph::TypeNodeExt as _;

pub struct PyTypeRenderer {}
impl PyTypeRenderer {
    fn render_alias(
        &self,
        dest: &mut impl Write,
        alias_name: &str,
        aliased_ty: &str,
    ) -> std::fmt::Result {
        writeln!(dest, "{alias_name} = {aliased_ty}")?;
        writeln!(dest)?;
        Ok(())
    }

    /// `props` is a map of prop_name -> (TypeName, serialization_name)
    fn render_object_type(
        &self,
        dest: &mut impl Write,
        ty_name: &str,
        props: IndexMap<String, (Arc<str>, bool)>,
    ) -> std::fmt::Result {
        writeln!(dest, r#"{ty_name} = typing.TypedDict("{ty_name}", {{"#)?;
        for (name, (ty_name, _optional)) in props.into_iter() {
            // FIXME: use NotRequired when bumping to python version
            // that supports it
            // also, remove the total param below
            // if optional {
            //     writeln!(dest, r#"    "{name}": typing.NotRequired[{ty_name}],"#)?;
            // } else {
            //     writeln!(dest, r#"    "{name}": {ty_name},"#)?;
            // }
            writeln!(dest, r#"    "{name}": {ty_name},"#)?;
        }
        writeln!(dest, "}}, total=False)")?;
        writeln!(dest)?;
        Ok(())
    }

    fn render_union_type(
        &self,
        dest: &mut impl Write,
        ty_name: &str,
        variants: Vec<Arc<str>>,
    ) -> std::fmt::Result {
        writeln!(dest, "{ty_name} = typing.Union[")?;
        for ty_name in variants.into_iter() {
            writeln!(dest, "    {ty_name},")?;
        }
        writeln!(dest, "]")?;
        writeln!(dest)?;
        writeln!(dest)?;
        Ok(())
    }

    fn quote_ty_name(
        &self,
        ty: &Type,
        (ty_name, cyclic): (RenderedName, Option<bool>),
        renderer: &mut TypeRenderer,
    ) -> Arc<str> {
        match ty_name {
            RenderedName::Name(name) => {
                if cyclic.is_some() && !name.contains('"') {
                    format!(r#""{name}""#).into()
                } else {
                    name
                }
            }
            RenderedName::Placeholder(_name) => renderer.placeholder_string(
                ty.name(),
                Box::new(move |ty_name| {
                    if !ty_name.contains('"') {
                        format!(r#""{ty_name}""#)
                    } else {
                        ty_name.into()
                    }
                }),
            ),
        }
    }
}

impl RenderType for PyTypeRenderer {
    fn render(
        &self,
        renderer: &mut TypeRenderer,
        cursor: &mut VisitCursor,
    ) -> anyhow::Result<String> {
        let body_required = type_body_required(&cursor.node);
        let name = match &cursor.node {
            Type::Function(_) => "None".into(),
            Type::Boolean(ty) if body_required => {
                let ty_name = normalize_type_title(ty.title());
                self.render_alias(renderer, &ty_name, "bool")?;
                ty_name
            }
            Type::Boolean(_) => "bool".into(),
            Type::Float(ty) if body_required => {
                let ty_name = normalize_type_title(ty.title());
                self.render_alias(renderer, &ty_name, "float")?;
                ty_name
            }
            Type::Float(_) => "float".into(),
            Type::Integer(ty) if body_required => {
                let ty_name = normalize_type_title(ty.title());
                self.render_alias(renderer, &ty_name, "int")?;
                ty_name
            }
            Type::Integer(_) => "int".into(),
            Type::String(ty) if body_required => {
                if let Some(variants) = &ty.enumeration {
                    let ty_name = normalize_type_title(ty.title());
                    // variants are valid strings in JSON (validated by the validator)
                    self.render_union_type(
                        renderer,
                        &ty_name,
                        variants
                            .iter()
                            .map(|val| format!("typing.Literal[{val}]").into())
                            .collect(),
                    )?;
                    ty_name
                } else if let Some(format) = ty.format_only() {
                    let ty_name =
                        normalize_type_title(&format!("string_{format}_{}", cursor.node.idx()));
                    self.render_alias(renderer, &ty_name, "str")?;
                    ty_name
                } else {
                    let ty_name = normalize_type_title(ty.title());
                    self.render_alias(renderer, &ty_name, "str")?;
                    ty_name
                }
            }
            Type::String(_) => "str".into(),
            Type::File(ty) if body_required => {
                let ty_name = normalize_type_title(ty.title());
                self.render_alias(renderer, &ty_name, "File")?;
                ty_name
            }
            Type::File(_) => "bytes".into(),
            Type::Object(ty) => {
                let props = ty
                    .properties()
                    .iter()
                    // generate property types first
                    .map(|(name, prop)| {
                        let ty_name = self.quote_ty_name(
                            &prop.type_,
                            renderer.render_subgraph(&prop.type_, cursor)?,
                            renderer,
                        );
                        let optional = matches!(&prop.type_, Type::Optional(_));
                        Ok::<_, anyhow::Error>((
                            normalize_struct_prop_name(&name[..]),
                            (ty_name, optional),
                        ))
                    })
                    .collect::<Result<IndexMap<_, _>, _>>()?;
                let ty_name = normalize_type_title(ty.title());
                self.render_object_type(renderer, &ty_name, props)?;
                ty_name
            }
            Type::Union(ty) => {
                let variants = ty
                    .variants()
                    .iter()
                    .map(|variant| {
                        let ty_name = self.quote_ty_name(
                            variant,
                            renderer.render_subgraph(variant, cursor)?,
                            renderer,
                        );
                        Ok::<_, anyhow::Error>(ty_name)
                    })
                    .collect::<Result<Vec<_>, _>>()?;
                let ty_name = normalize_type_title(ty.title());
                self.render_union_type(renderer, &ty_name, variants)?;
                ty_name
            }
            Type::Optional(ty)
                if ty.default_value.is_none() && ty.title().starts_with("optional_") =>
            {
                // TODO: handle cyclic case where entire cycle is aliases
                let inner_ty_name = self.quote_ty_name(
                    ty.item(),
                    renderer.render_subgraph(ty.item(), cursor)?,
                    renderer,
                );
                format!("typing.Optional[{inner_ty_name}]")
            }
            Type::Optional(ty) => {
                // TODO: handle cyclic case where entire cycle is aliases
                let inner_ty_name = self.quote_ty_name(
                    ty.item(),
                    renderer.render_subgraph(ty.item(), cursor)?,
                    renderer,
                );
                let ty_name = normalize_type_title(ty.title());
                self.render_alias(
                    renderer,
                    &ty_name,
                    &format!("typing.Union[{inner_ty_name}, None]"),
                )?;
                ty_name
            }
            // NOTE: keep this condition
            // in sync with similar one above
            Type::List(ty)
                if matches!((ty.max_items, ty.min_items), (None, None))
                    && ty.title().starts_with("list_") =>
            {
                // TODO: handle cyclic case where entire cycle is aliases
                let inner_ty_name = self.quote_ty_name(
                    ty.item(),
                    renderer.render_subgraph(ty.item(), cursor)?,
                    renderer,
                );
                if ty.unique_items {
                    format!("typing.Set[{inner_ty_name}]")
                } else {
                    format!("typing.List[{inner_ty_name}]")
                }
            }
            Type::List(ty) => {
                // TODO: handle cyclic case where entire cycle is aliases
                let inner_ty_name = self.quote_ty_name(
                    ty.item(),
                    renderer.render_subgraph(ty.item(), cursor)?,
                    renderer,
                );
                let ty_name = normalize_type_title(ty.title());
                if ty.unique_items {
                    self.render_alias(renderer, &ty_name, &format!("typing.Set[{inner_ty_name}]"))?;
                } else {
                    self.render_alias(
                        renderer,
                        &ty_name,
                        &format!("typing.List[{inner_ty_name}]"),
                    )?;
                };
                ty_name
            }
        };
        Ok(name)
    }
}
