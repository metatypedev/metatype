// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::Write;

use common::typegraph::*;

use super::utils::{normalize_struct_prop_name, normalize_type_title};
use crate::{interlude::*, mdk::types::*};

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
        props: IndexMap<String, Rc<str>>,
    ) -> std::fmt::Result {
        writeln!(dest, "export type {ty_name} = {{")?;
        for (name, ty_name) in props.into_iter() {
            writeln!(dest, "  {name}: {ty_name};")?;
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
    fn render_name(&self, _renderer: &mut TypeRenderer, cursor: &VisitCursor) -> RenderedName {
        use RenderedName::*;
        let body_required = self.type_body_required(cursor.node.clone());
        match cursor.node.clone().deref() {
            // functions will be absent in our gnerated types
            TypeNode::Function { .. } => Name("void".into()),
            // under certain conditionds, we don't want to generate aliases
            // for primitive types. this includes
            // - types with default generated names
            // - types with no special semantics
            TypeNode::Boolean { .. } if !body_required => Name("boolean".into()),
            TypeNode::Integer { .. } if !body_required => Name("number".to_string()),
            TypeNode::Float { .. } if !body_required => Name("number".to_string()),
            TypeNode::String { .. } if !body_required => Name("string".to_string()),
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
                Name(normalize_type_title(&format!("string_{format}")))
            }
            TypeNode::File { .. } if !body_required => Name("File".to_string()),
            TypeNode::Optional {
                // NOTE: keep this condition
                // in sync with similar one
                // below
                base,
                data:
                    OptionalTypeData {
                        default_value: None,
                        ..
                    },
            } if base.title.starts_with("optional_") => {
                // since the type name of (T | undefined | null) and Array<T> depends on
                // the name of the inner type, we use placeholders at this ploint
                Placeholder
            }
            TypeNode::List {
                // NOTE: keep this condition
                // in sync with similar one
                // below
                base,
                data:
                    ListTypeData {
                        min_items: None,
                        max_items: None,
                        ..
                    },
            } if base.title.starts_with("list_") => {
                // since the type name of (T | undefined | null) and Array<T> depends on
                // the name of the inner type, we use placeholders at this ploint
                Placeholder
            }
            ty => Name(normalize_type_title(&ty.base().title)),
        }
    }

    fn render_body(
        &self,
        renderer: &mut TypeRenderer,
        ty_name: &str,
        cursor: &mut VisitCursor,
    ) -> anyhow::Result<()> {
        match cursor.node.clone().deref() {
            TypeNode::Function { .. } => {}
            TypeNode::Boolean { .. } => {
                self.render_alias(renderer, ty_name, "boolean")?;
            }
            TypeNode::Float { .. } => {
                self.render_alias(renderer, ty_name, "number")?;
            }
            TypeNode::Integer { .. } => {
                self.render_alias(renderer, ty_name, "number")?;
            }
            TypeNode::String {
                base:
                    TypeNodeBase {
                        enumeration: Some(variants),
                        ..
                    },
                ..
            } => {
                // variants are valid strings in JSON (validated by the validator)
                self.render_alias(renderer, ty_name, &variants.join(" | "))?;
            }
            TypeNode::String { .. } => {
                self.render_alias(renderer, ty_name, "string")?;
            }
            TypeNode::File { .. } => {
                self.render_alias(renderer, ty_name, "File")?;
            }
            TypeNode::Any { .. } => {
                self.render_alias(renderer, ty_name, "any")?;
            }
            TypeNode::Object { data, .. } => {
                let props = data
                    .properties
                    .iter()
                    // generate property types first
                    .map(|(name, &dep_id)| {
                        let (ty_name, _cyclic) = renderer.render_subgraph(dep_id, cursor)?;
                        Ok::<_, anyhow::Error>((normalize_struct_prop_name(&name[..]), ty_name))
                    })
                    .collect::<Result<IndexMap<_, _>, _>>()?;
                self.render_object_type(renderer, ty_name, props)?;
            }
            TypeNode::Either {
                data: EitherTypeData { one_of: variants },
                ..
            }
            | TypeNode::Union {
                data: UnionTypeData { any_of: variants },
                ..
            } => {
                let variants = variants
                    .iter()
                    .map(|&inner| {
                        let (ty_name, _cyclic) = renderer.render_subgraph(inner, cursor)?;
                        Ok::<_, anyhow::Error>(ty_name)
                    })
                    .collect::<Result<Vec<_>, _>>()?;
                self.render_union_type(renderer, ty_name, variants)?;
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

                let true_ty_name = format!("({inner_ty_name}) | null | undefined");
                let true_ty_name: Rc<str> = true_ty_name.into();
                let normalized_true_name = normalize_struct_prop_name(&true_ty_name);
                renderer.replace_placeholder_ty_name(
                    cursor.id,
                    true_ty_name,
                    vec![(normalize_struct_prop_name(ty_name), normalized_true_name)],
                );
            }
            TypeNode::Optional { data, .. } => {
                // TODO: handle cyclic case where entire cycle is aliases
                let (inner_ty_name, _) = renderer.render_subgraph(data.item, cursor)?;
                self.render_alias(
                    renderer,
                    ty_name,
                    &format!("{inner_ty_name} | null | undefined"),
                )?;
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
                let true_ty_name = if let Some(true) = unique_items {
                    // TODO: use sets?
                    format!("Array<{inner_ty_name}>")
                } else {
                    format!("Array<{inner_ty_name}>")
                };
                let true_ty_name: Rc<str> = true_ty_name.into();
                let normalized_true_name = normalize_struct_prop_name(&true_ty_name);
                renderer.replace_placeholder_ty_name(
                    cursor.id,
                    true_ty_name,
                    vec![(normalize_struct_prop_name(ty_name), normalized_true_name)],
                );
            }
            TypeNode::List { data, .. } => {
                // TODO: handle cyclic case where entire cycle is aliases
                let (inner_ty_name, _) = renderer.render_subgraph(data.items, cursor)?;
                if let Some(true) = data.unique_items {
                    // FIXME: use set?
                    self.render_alias(renderer, ty_name, &format!("Array<{inner_ty_name}>"))?;
                } else {
                    self.render_alias(renderer, ty_name, &format!("Array<{inner_ty_name}>"))?;
                };
            }
        };
        anyhow::Ok(())
    }
}
