// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::Write;

use common::typegraph::*;

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
        props: IndexMap<String, (Rc<str>, bool)>,
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
        variants: Vec<Rc<str>>,
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
        let body_required = type_body_required(cursor.node.clone());
        let name = match cursor.node.clone().deref() {
            TypeNode::Function { .. } => "void".into(),
            TypeNode::Boolean { base } if body_required => {
                let ty_name = normalize_type_title(&base.title);
                self.render_alias(renderer, &ty_name, "boolean")?;
                ty_name
            }
            TypeNode::Boolean { .. } => "boolean".into(),
            TypeNode::Float { base, .. } if body_required => {
                let ty_name = normalize_type_title(&base.title);
                self.render_alias(renderer, &ty_name, "number")?;
                ty_name
            }
            TypeNode::Float { .. } => "number".into(),
            TypeNode::Integer { base, .. } if body_required => {
                let ty_name = normalize_type_title(&base.title);
                self.render_alias(renderer, &ty_name, "number")?;
                ty_name
            }
            TypeNode::Integer { .. } => "number".into(),
            TypeNode::String {
                base:
                    TypeNodeBase {
                        enumeration: Some(variants),
                        title,
                        ..
                    },
                ..
            } if body_required => {
                let ty_name = normalize_type_title(title);
                // variants are valid strings in JSON (validated by the validator)
                self.render_alias(renderer, &ty_name, &variants.join(" | "))?;
                ty_name
            }
            TypeNode::String {
                data:
                    StringTypeData {
                        format: Some(format),
                        pattern: None,
                        min_length: None,
                        max_length: None,
                    },
                base:
                    TypeNodeBase {
                        title,
                        enumeration: None,
                        ..
                    },
            } if title.starts_with("string_") => {
                let ty_name = normalize_type_title(&format!("string_{format}_{}", cursor.id));
                self.render_alias(renderer, &ty_name, "string")?;
                ty_name
            }
            TypeNode::String { base, .. } if body_required => {
                let ty_name = normalize_type_title(&base.title);
                self.render_alias(renderer, &ty_name, "string")?;
                ty_name
            }
            TypeNode::String { .. } => "string".into(),
            TypeNode::File { base, .. } if body_required => {
                let ty_name = normalize_type_title(&base.title);
                self.render_alias(renderer, &ty_name, "File")?;
                ty_name
            }
            TypeNode::File { .. } => "File".into(),
            TypeNode::Any { base } if body_required => {
                let ty_name = normalize_type_title(&base.title);
                self.render_alias(renderer, &ty_name, "any")?;
                ty_name
            }
            TypeNode::Any { .. } => "any".into(),
            TypeNode::Object { data, base } => {
                let props = data
                    .properties
                    .iter()
                    // generate property types first
                    .map(|(name, &dep_id)| {
                        let (ty_name, _cyclic) = renderer.render_subgraph(dep_id, cursor)?;
                        let ty_name = match ty_name {
                            RenderedName::Name(name) => name,
                            RenderedName::Placeholder(name) => name,
                        };
                        let optional = matches!(
                            renderer.nodes[dep_id as usize].deref(),
                            TypeNode::Optional { .. }
                        );
                        Ok::<_, anyhow::Error>((
                            normalize_struct_prop_name(&name[..]),
                            (ty_name, optional),
                        ))
                    })
                    .collect::<Result<IndexMap<_, _>, _>>()?;

                let ty_name = normalize_type_title(&base.title);
                if !props.is_empty() {
                    self.render_object_type(renderer, &ty_name, props)?;
                } else {
                    self.render_alias(renderer, &ty_name, "Record<string, never>")?;
                }
                ty_name
            }
            TypeNode::Either {
                data: EitherTypeData { one_of: variants },
                base,
            }
            | TypeNode::Union {
                data: UnionTypeData { any_of: variants },
                base,
            } => {
                let variants = variants
                    .iter()
                    .map(|&inner| {
                        let (ty_name, _cyclic) = renderer.render_subgraph(inner, cursor)?;
                        let ty_name = match ty_name {
                            RenderedName::Name(name) => name,
                            RenderedName::Placeholder(name) => name,
                        };
                        Ok::<_, anyhow::Error>(ty_name)
                    })
                    .collect::<Result<Vec<_>, _>>()?;
                let ty_name = normalize_type_title(&base.title);
                self.render_union_type(renderer, &ty_name, variants)?;
                ty_name
            }
            TypeNode::Optional {
                // NOTE: keep this condition
                // in sync with similar one above
                base,
                data:
                    OptionalTypeData {
                        default_value: None,
                        item,
                    },
            } if base.title.starts_with("optional_") => {
                // TODO: handle cyclic case where entire cycle is aliases
                let (inner_ty_name, _) = renderer.render_subgraph(*item, cursor)?;
                let inner_ty_name = match inner_ty_name {
                    RenderedName::Name(name) => name,
                    RenderedName::Placeholder(name) => name,
                };
                format!("({inner_ty_name}) | null | undefined")
            }
            TypeNode::Optional { data, base } => {
                // TODO: handle cyclic case where entire cycle is aliases
                let (inner_ty_name, _) = renderer.render_subgraph(data.item, cursor)?;
                let inner_ty_name = match inner_ty_name {
                    RenderedName::Name(name) => name,
                    RenderedName::Placeholder(name) => name,
                };
                let ty_name = normalize_type_title(&base.title);
                self.render_alias(
                    renderer,
                    &ty_name,
                    &format!("{inner_ty_name} | null | undefined"),
                )?;
                ty_name
            }
            TypeNode::List {
                // NOTE: keep this condition
                // in sync with similar one above
                base,
                data:
                    ListTypeData {
                        min_items: None,
                        max_items: None,
                        unique_items,
                        items,
                    },
            } if base.title.starts_with("list_") => {
                // TODO: handle cyclic case where entire cycle is aliases
                let (inner_ty_name, _) = renderer.render_subgraph(*items, cursor)?;
                let inner_ty_name = match inner_ty_name {
                    RenderedName::Name(name) => name,
                    RenderedName::Placeholder(name) => name,
                };
                if let Some(true) = unique_items {
                    // TODO: use sets?
                    format!("Array<{inner_ty_name}>")
                } else {
                    format!("Array<{inner_ty_name}>")
                }
            }
            TypeNode::List { data, base } => {
                // TODO: handle cyclic case where entire cycle is aliases
                let (inner_ty_name, _) = renderer.render_subgraph(data.items, cursor)?;
                let inner_ty_name = match inner_ty_name {
                    RenderedName::Name(name) => name,
                    RenderedName::Placeholder(name) => name,
                };
                let ty_name = normalize_type_title(&base.title);
                if let Some(true) = data.unique_items {
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
