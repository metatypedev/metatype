// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::Write;

use common::typegraph::*;

use super::utils::normalize_type_title;
use crate::{interlude::*, shared::types::*};

pub struct PyNodeSelectionsRenderer {
    pub arg_ty_names: Rc<NameMemo>,
}

enum SelectionTy {
    ScalarNoArgs,
    ScalarArgs { arg_ty: Rc<str> },
    CompositeArgs { arg_ty: Rc<str>, select_ty: Rc<str> },
    CompositeNoArgs { select_ty: Rc<str> },
}

impl PyNodeSelectionsRenderer {
    /// `props` is a map of prop_name -> (SelectionType, ArgumentType)
    fn render_for_object(
        &self,
        dest: &mut impl Write,
        ty_name: &str,
        props: IndexMap<String, SelectionTy>,
    ) -> std::fmt::Result {
        writeln!(dest, "class {ty_name}(Selection, total=False):")?;
        for (name, select_ty) in props {
            use SelectionTy::*;
            match select_ty {
                ScalarNoArgs => writeln!(dest, "    {name}: ScalarSelectNoArgs")?,
                ScalarArgs { arg_ty } => writeln!(dest, "    {name}: ScalarSelectArgs[{arg_ty}]")?,
                CompositeNoArgs { select_ty } => {
                    writeln!(dest, "    {name}: CompositeSelectNoArgs[{select_ty}]")?
                }
                CompositeArgs { arg_ty, select_ty } => writeln!(
                    dest,
                    "    {name}: CompositeSelectArgs[{arg_ty}, {select_ty}]"
                )?,
            };
        }
        writeln!(dest)?;
        Ok(())
    }

    fn selection_for_field(
        &self,
        ty: u32,
        renderer: &mut TypeRenderer,
        cursor: &mut VisitCursor,
    ) -> Result<SelectionTy> {
        Ok(match renderer.nodes[ty as usize].deref() {
            TypeNode::Boolean { .. }
            | TypeNode::Float { .. }
            | TypeNode::Integer { .. }
            | TypeNode::String { .. }
            | TypeNode::File { .. } => SelectionTy::ScalarNoArgs,
            TypeNode::Function { data, .. } => {
                let arg_ty = self.arg_ty_names.get(&data.input).unwrap().clone();
                match self.selection_for_field(data.output, renderer, cursor)? {
                    SelectionTy::ScalarNoArgs => SelectionTy::ScalarArgs { arg_ty },
                    SelectionTy::CompositeNoArgs { select_ty } => {
                        SelectionTy::CompositeArgs { select_ty, arg_ty }
                    }
                    SelectionTy::CompositeArgs { .. } | SelectionTy::ScalarArgs { .. } => {
                        unreachable!("function can not return a function")
                    }
                }
            }
            TypeNode::Optional {
                data: OptionalTypeData { item, .. },
                ..
            }
            | TypeNode::List {
                data: ListTypeData { items: item, .. },
                ..
            } => self.selection_for_field(*item, renderer, cursor)?,
            TypeNode::Object { .. } => SelectionTy::CompositeNoArgs {
                select_ty: renderer.render_subgraph(ty, cursor)?.0.unwrap(),
            },
            TypeNode::Union { .. } | TypeNode::Either { .. } => todo!("unions are wip"),
            TypeNode::Any { .. } => unimplemented!("Any type support not implemented"),
        })
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
                                name.clone(),
                                self.selection_for_field(dep_id, renderer, cursor)?
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
