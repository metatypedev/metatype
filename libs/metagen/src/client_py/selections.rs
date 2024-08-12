// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::Write;

use common::typegraph::*;

use super::utils::*;
use crate::{interlude::*, shared::client::*, shared::types::*};

pub struct PyNodeSelectionsRenderer {
    pub arg_ty_names: Rc<NameMemo>,
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
}

impl RenderType for PyNodeSelectionsRenderer {
    fn render(&self, renderer: &mut TypeRenderer, cursor: &mut VisitCursor) -> Result<String> {
        use heck::ToPascalCase;

        let name = match cursor.node.clone().deref() {
            TypeNode::Boolean { .. }
            | TypeNode::Float { .. }
            | TypeNode::Integer { .. }
            | TypeNode::String { .. }
            | TypeNode::File { .. } => unreachable!("scalars don't get to have selections"),
            TypeNode::Any { .. } => unimplemented!("Any type support not implemented"),
            TypeNode::Optional { data: OptionalTypeData { item, .. }, .. }
            | TypeNode::List { data: ListTypeData { items: item, .. }, .. }
            | TypeNode::Function { data:FunctionTypeData { output: item, .. }, .. }
                => renderer.render_subgraph(*item, cursor)?.0.unwrap().to_string(),
            TypeNode::Object { data, base } => {
                let props = data
                    .properties
                    .iter()
                    // generate property types first
                    .map(|(name, &dep_id)| {
                        eyre::Ok(
                            (
                                normalize_struct_prop_name(name),
                                selection_for_field(dep_id, &self.arg_ty_names, renderer, cursor)?
                            )
                        )
                    })
                    .collect::<Result<IndexMap<_, _>, _>>()?;
                let node_name = &base.title;
                let ty_name = normalize_type_title(node_name);
                let ty_name = format!("{ty_name}Selections").to_pascal_case();
                self.render_for_object(renderer, &ty_name, props)?;
                ty_name
            }
            TypeNode::Either {
                ..
                // data: EitherTypeData { one_of: variants },
                // base,
            }
            | TypeNode::Union {
                ..
                // data: UnionTypeData { any_of: variants },
                // base,
            } => {
                todo!("unions are wip")
            }
        };
        Ok(name)
    }
}
