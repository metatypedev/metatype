// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::Write;

use typegraph::TypeNodeExt as _;

use super::utils::{normalize_struct_prop_name, normalize_type_title};
use crate::{interlude::*, shared::types::*};

pub struct TypescriptTypeRenderer {}
impl TypescriptTypeRenderer {
    fn render_alias(
        &self,
        out: &mut impl Write,
        alias_name: &str,
        aliased_ty: &str,
    ) -> std::fmt::Result {
        writeln!(out, "export type {alias_name} = {aliased_ty};")
    }

    /// `props` is a map of prop_name -> (TypeName, serialization_name)
    fn render_object_type(
        &self,
        dest: &mut impl Write,
        ty_name: &str,
        props: IndexMap<String, (Arc<str>, bool)>,
    ) -> std::fmt::Result {
        writeln!(dest, "export type {ty_name} = {{")?;
        for (name, (ty_name, optional)) in props.into_iter() {
            if optional {
                writeln!(dest, "  {name}?: {ty_name};")?;
            } else {
                writeln!(dest, "  {name}: {ty_name};")?;
            }
        }
        writeln!(dest, "}};")?;
        Ok(())
    }

    fn render_union_type(
        &self,
        dest: &mut impl Write,
        ty_name: &str,
        variants: Vec<Arc<str>>,
    ) -> std::fmt::Result {
        write!(dest, "export type {ty_name} =")?;
        for ty_name in variants.into_iter() {
            write!(dest, "\n  | ({ty_name})")?;
        }
        writeln!(dest, ";")?;
        Ok(())
    }
}

impl RenderType for TypescriptTypeRenderer {
    fn render(
        &self,
        renderer: &mut TypeRenderer,
        cursor: &mut VisitCursor,
    ) -> anyhow::Result<String> {
        let body_required = type_body_required(&cursor.node);
        let name = match cursor.node.clone() {
            Type::Function { .. } => "void".into(),
            Type::Boolean(ty) if body_required => {
                let ty_name = normalize_type_title(&ty.name());
                self.render_alias(renderer, &ty_name, "boolean")?;
                ty_name
            }
            Type::Boolean(_) => "boolean".into(),
            Type::Float(ty) if body_required => {
                let ty_name = normalize_type_title(&ty.name());
                self.render_alias(renderer, &ty_name, "number")?;
                ty_name
            }
            Type::Float(_) => "number".into(),
            Type::Integer(ty) if body_required => {
                let ty_name = normalize_type_title(&ty.name());
                self.render_alias(renderer, &ty_name, "number")?;
                ty_name
            }
            Type::Integer(_) => "number".into(),
            Type::String(ty) if body_required => {
                if let Some(variants) = &ty.enumeration {
                    let ty_name = normalize_type_title(&ty.name());
                    self.render_alias(renderer, &ty_name, &variants.join(" | "))?;
                    ty_name
                } else if let Some(format) = ty.format_only() {
                    let ty_name =
                        normalize_type_title(&format!("string_{format}_{}", cursor.node.idx()));
                    self.render_alias(renderer, &ty_name, "string")?;
                    ty_name
                } else {
                    let ty_name = normalize_type_title(&ty.name());
                    self.render_alias(renderer, &ty_name, "string")?;
                    ty_name
                }
            }
            Type::String { .. } => "string".into(),
            Type::File(ty) if body_required => {
                let ty_name = normalize_type_title(&ty.name());
                self.render_alias(renderer, &ty_name, "File")?;
                ty_name
            }
            Type::File(_) => "File".into(),
            Type::Object(ty) => {
                let props = ty
                    .properties()
                    .iter()
                    // generate property types first
                    .map(|(name, prop)| {
                        let (ty_name, _cyclic) = renderer.render_subgraph(&prop.type_, cursor)?;
                        // let ty_name = match ty_name {
                        //     RenderedName::Name(name) => name,
                        //     RenderedName::Placeholder(name) => name,
                        // };
                        let optional = matches!(prop.type_, Type::Optional(_));
                        Ok::<_, anyhow::Error>((
                            normalize_struct_prop_name(&name[..]),
                            (ty_name, optional),
                        ))
                    })
                    .collect::<Result<IndexMap<_, _>, _>>()?;

                let ty_name = normalize_type_title(&ty.name());
                if !props.is_empty() {
                    self.render_object_type(renderer, &ty_name, props)?;
                } else {
                    self.render_alias(renderer, &ty_name, "Record<string, never>")?;
                }
                ty_name
            }
            Type::Union(ty) => {
                let variants = ty
                    .variants()
                    .iter()
                    .map(|variant| {
                        let (ty_name, _cyclic) = renderer.render_subgraph(variant, cursor)?;
                        // let ty_name = match ty_name {
                        //     RenderedName::Name(name) => name,
                        //     RenderedName::Placeholder(name) => name,
                        // };
                        Ok::<_, anyhow::Error>(ty_name)
                    })
                    .collect::<Result<Vec<_>, _>>()?;
                let ty_name = normalize_type_title(&ty.name());
                self.render_union_type(renderer, &ty_name, variants)?;
                ty_name
            }
            Type::Optional(ty)
                if ty.default_value.is_none() && ty.title().starts_with("optional_") =>
            {
                // TODO: handle cyclic case where entire cycle is aliases
                let (inner_ty_name, _) = renderer.render_subgraph(ty.item(), cursor)?;
                // let inner_ty_name = match inner_ty_name {
                //     RenderedName::Name(name) => name,
                //     RenderedName::Placeholder(name) => name,
                // };
                format!("({inner_ty_name}) | null | undefined")
            }
            Type::Optional(ty) => {
                // TODO: handle cyclic case where entire cycle is aliases
                let (inner_ty_name, _) = renderer.render_subgraph(ty.item(), cursor)?;
                // let inner_ty_name = match inner_ty_name {
                //     RenderedName::Name(name) => name,
                //     RenderedName::Placeholder(name) => name,
                // };
                let ty_name = normalize_type_title(&ty.name());
                self.render_alias(
                    renderer,
                    &ty_name,
                    &format!("{inner_ty_name} | null | undefined"),
                )?;
                ty_name
            }
            Type::List(ty)
                if matches!((ty.max_items, ty.min_items), (None, None))
                    && ty.title().starts_with("list_") =>
            {
                // TODO: handle cyclic case where entire cycle is aliases
                let (inner_ty_name, _) = renderer.render_subgraph(ty.item()?, cursor)?;
                // let inner_ty_name = match inner_ty_name {
                //     RenderedName::Name(name) => name,
                //     RenderedName::Placeholder(name) => name,
                // };
                if let true = ty.unique_items {
                    // TODO: use sets?
                    format!("Array<{inner_ty_name}>")
                } else {
                    format!("Array<{inner_ty_name}>")
                }
            }
            Type::List(ty) => {
                // TODO: handle cyclic case where entire cycle is aliases
                let (inner_ty_name, _) = renderer.render_subgraph(ty.item()?, cursor)?;
                // let inner_ty_name = match inner_ty_name {
                //     RenderedName::Name(name) => name,
                //     RenderedName::Placeholder(name) => name,
                // };
                let ty_name = normalize_type_title(&ty.name());
                if let true = ty.unique_items {
                    // FIXME: use set?
                    self.render_alias(renderer, &ty_name, &format!("Array<{inner_ty_name}>"))?;
                } else {
                    self.render_alias(renderer, &ty_name, &format!("Array<{inner_ty_name}>"))?;
                };
                ty_name
            }
        };
        Ok(name)
    }
}
