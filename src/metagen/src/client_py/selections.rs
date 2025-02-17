// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::Write;

use super::utils::*;
use crate::{interlude::*, shared::client::*, shared::types::*};
use typegraph::TypeNodeExt as _;

pub struct PyNodeSelectionsRenderer {
    pub arg_ty_names: Arc<NameMemo>,
}

impl PyNodeSelectionsRenderer {
    /// `props` is a map of prop_name -> (SelectionType, ArgumentType)
    fn render_for_object(
        &self,
        dest: &mut impl Write,
        ty_name: &str,
        props: IndexMap<String, SelectionTy>,
    ) -> std::fmt::Result {
        writeln!(dest, r#"{ty_name} = typing.TypedDict("{ty_name}", {{"#)?;
        writeln!(dest, r#"    "_": SelectionFlags,"#)?;
        for (name, select_ty) in props {
            use SelectionTy::*;
            match select_ty {
                Scalar => writeln!(dest, r#"    "{name}": ScalarSelectNoArgs,"#)?,
                ScalarArgs { arg_ty } => {
                    writeln!(dest, r#"    "{name}": ScalarSelectArgs["{arg_ty}"],"#)?
                }
                Composite { select_ty } => writeln!(
                    dest,
                    r#"    "{name}": CompositeSelectNoArgs["{select_ty}"],"#
                )?,
                CompositeArgs { arg_ty, select_ty } => writeln!(
                    dest,
                    r#"    "{name}": CompositeSelectArgs["{arg_ty}", "{select_ty}"],"#
                )?,
            };
        }
        writeln!(dest, "}}, total=False)")?;
        writeln!(dest)?;
        Ok(())
    }

    fn render_for_union(
        &self,
        dest: &mut TypeRenderer,
        ty_name: &str,
        variants: IndexMap<String, (String, SelectionTy)>,
    ) -> std::fmt::Result {
        writeln!(dest, r#"{ty_name} = typing.TypedDict("{ty_name}", {{"#)?;
        writeln!(dest, r#"    "_": SelectionFlags,"#)?;
        for (_name, (variant_ty, select_ty)) in &variants {
            use SelectionTy::*;
            match select_ty {
                Scalar | ScalarArgs { .. } => {
                    // scalars always get selected if the union node
                    // gets selected
                    unreachable!()
                }
                Composite { select_ty } => writeln!(
                    dest,
                    // use variant_ty as key instead of normalized struct name
                    // we want it to match the varaint name from the NodeMetas
                    // later so no normlalization is used
                    r#"    "{variant_ty}": CompositeSelectNoArgs["{select_ty}"],"#
                )?,
                CompositeArgs { arg_ty, select_ty } => writeln!(
                    dest,
                    r#"    "{variant_ty}": CompositeSelectArgs["{arg_ty}", "{select_ty}"],"#
                )?,
            };
        }
        writeln!(dest, "}}, total=False)")?;
        writeln!(dest)?;
        Ok(())
    }
}

impl RenderType for PyNodeSelectionsRenderer {
    fn render(&self, renderer: &mut TypeRenderer, cursor: &mut VisitCursor) -> Result<String> {
        use heck::ToPascalCase;

        let render_item = |item: &Type, cursor: &mut VisitCursor| -> Result<String> {
            Ok(renderer
                .render_subgraph(item, cursor)?
                .0
                .unwrap()
                .to_string())
        };
        let name = match &cursor.node {
            Type::Boolean(_)
            | Type::Float(_)
            | Type::Integer(_)
            | Type::String(_)
            | Type::File(_) => unreachable!("scalars don't get to have selections"),
            Type::Optional(ty) => render_item(ty.item(), cursor)?,
            Type::List(ty) => render_item(ty.item(), cursor)?,
            Type::Function(ty) => render_item(ty.output(), cursor)?,
            Type::Object(ty) => {
                let props = ty
                    .properties()
                    .iter()
                    // generate property types first
                    .map(|(name, prop)| {
                        eyre::Ok((
                            normalize_struct_prop_name(name),
                            selection_for_field(&prop.type_, &self.arg_ty_names, renderer, cursor)?,
                        ))
                    })
                    .collect::<Result<IndexMap<_, _>, _>>()?;
                let node_name = &ty.title();
                let ty_name = normalize_type_title(node_name);
                let ty_name = format!("{ty_name}Selections").to_pascal_case();
                self.render_for_object(renderer, &ty_name, props)?;
                ty_name
            }
            Type::Union(ty) => {
                let variants = ty
                    .variants()
                    .iter()
                    .filter_map(|variant| {
                        if !TypeRenderer::is_composite(variant) {
                            return None;
                        }
                        let ty_name = variant.title().to_string();
                        let struct_prop_name =
                            normalize_struct_prop_name(&normalize_type_title(&ty_name[..]));

                        let selection = match selection_for_field(
                            variant,
                            &self.arg_ty_names,
                            renderer,
                            cursor,
                        ) {
                            Ok(selection) => selection,
                            Err(err) => return Some(Err(err)),
                        };

                        Some(eyre::Ok((struct_prop_name, (ty_name, selection))))
                    })
                    .collect::<Result<IndexMap<_, _>, _>>()?;
                let ty_name = normalize_type_title(ty.title());
                let ty_name = format!("{ty_name}Selections").to_pascal_case();
                self.render_for_union(renderer, &ty_name, variants)?;
                ty_name
            }
        };
        Ok(name)
    }
}
