// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::Write;

use common::typegraph::*;

use super::utils::{normalize_struct_prop_name, normalize_type_title};
use crate::{interlude::*, shared::types::*};

pub struct PyTypeRenderer {}
impl PyTypeRenderer {
    fn render_alias(
        &self,
        out: &mut impl Write,
        alias_name: &str,
        aliased_ty: &str,
    ) -> std::fmt::Result {
        writeln!(out, "{alias_name} = {aliased_ty}")?;
        writeln!(out)
    }

    /// `props` is a map of prop_name -> (TypeName, serialization_name)
    fn render_object_type(
        &self,
        dest: &mut impl Write,
        ty_name: &str,
        props: IndexMap<String, Rc<str>>,
    ) -> std::fmt::Result {
        writeln!(dest, "class {ty_name}(typing.TypedDict):")?;
        for (name, ty_name) in props.into_iter() {
            writeln!(dest, "    {name}: {ty_name}")?;
        }
        writeln!(dest)
    }

    fn render_union_type(
        &self,
        dest: &mut impl Write,
        ty_name: &str,
        variants: Vec<Rc<str>>,
    ) -> std::fmt::Result {
        writeln!(dest, "{ty_name} = typing.Union[")?;
        for ty_name in variants.into_iter() {
            write!(dest, "\n    {ty_name},")?;
        }
        writeln!(dest, "]")?;
        writeln!(dest)
    }
}

impl RenderType for PyTypeRenderer {
    fn render(
        &self,
        renderer: &mut TypeRenderer,
        cursor: &mut VisitCursor,
    ) -> anyhow::Result<String> {
        let body_required = type_body_required(cursor.node.clone());
        let name = match cursor.node.clone().deref() {
            TypeNode::Function { .. } => "None".into(),
            TypeNode::Boolean { base } if body_required => {
                let ty_name = normalize_type_title(&base.title);
                self.render_alias(renderer, &ty_name, "bool")?;
                ty_name
            }
            TypeNode::Boolean { .. } => "bool".into(),
            TypeNode::Float { base, .. } if body_required => {
                let ty_name = normalize_type_title(&base.title);
                self.render_alias(renderer, &ty_name, "float")?;
                ty_name
            }
            TypeNode::Float { .. } => "float".into(),
            TypeNode::Integer { base, .. } if body_required => {
                let ty_name = normalize_type_title(&base.title);
                self.render_alias(renderer, &ty_name, "int")?;
                ty_name
            }
            TypeNode::Integer { .. } => "int".into(),
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
                self.render_alias(
                    renderer,
                    &ty_name,
                    &variants
                        .iter()
                        .map(|val| format!("typing.Literal[{val}]"))
                        .collect::<Vec<_>>()
                        .join(" | "),
                )?;
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
                let ty_name = normalize_type_title(&format!("string_{format}"));
                self.render_alias(renderer, &ty_name, "str")?;
                ty_name
            }
            TypeNode::String { base, .. } if body_required => {
                let ty_name = normalize_type_title(&base.title);
                self.render_alias(renderer, &ty_name, "str")?;
                ty_name
            }
            TypeNode::String { .. } => "str".into(),
            TypeNode::File { base, .. } if body_required => {
                let ty_name = normalize_type_title(&base.title);
                self.render_alias(renderer, &ty_name, "bytes")?;
                ty_name
            }
            TypeNode::File { .. } => "bytes".into(),
            TypeNode::Any { base } if body_required => {
                let ty_name = normalize_type_title(&base.title);
                self.render_alias(renderer, &ty_name, "typing.Any")?;
                ty_name
            }
            TypeNode::Any { .. } => "typing.Any".into(),
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
                        Ok::<_, anyhow::Error>((normalize_struct_prop_name(&name[..]), ty_name))
                    })
                    .collect::<Result<IndexMap<_, _>, _>>()?;
                let ty_name = normalize_type_title(&base.title);
                self.render_object_type(renderer, &ty_name, props)?;
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
                format!("typing.Union[{inner_ty_name}, None]")
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
                    &format!("typing.Union[{inner_ty_name}, None]"),
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
                    format!("typing.Set[{inner_ty_name}]")
                } else {
                    format!("typing.List[{inner_ty_name}]")
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
