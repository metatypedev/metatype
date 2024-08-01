// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::Write;

use common::typegraph::*;

use super::utils::normalize_type_title;
use crate::{interlude::*, shared::types::*};

pub struct TsNodeSelectionsRenderer {
    pub arg_ty_names: Rc<NameMemo>,
}

impl TsNodeSelectionsRenderer {
    /// `props` is a map of prop_name -> (SelectionType, ArgumentType)
    fn render_for_object(
        &self,
        dest: &mut impl Write,
        ty_name: &str,
        props: IndexMap<String, (Rc<str>, Option<Rc<str>>)>,
    ) -> std::fmt::Result {
        writeln!(dest, "class {ty_name}(Selection, total=False):")?;
        for (name, (select_ty, arg_ty)) in props {
            if let Some(arg_ty) = arg_ty {
                if &select_ty[..] == "boolean" {
                    // just providing the argument is enough to signal selection
                    writeln!(dest, "    {name}:?: {arg_ty};")?;
                } else {
                    // we need to allow false to allow explicit disabling
                    // when the select all flag is set
                    writeln!(dest, "    {name}?: [{arg_ty}, {select_ty}] | false;")?;
                }
            } else if &select_ty[..] == "boolean" {
                writeln!(dest, "    {name}?: {select_ty};")?;
            } else {
                writeln!(dest, "    {name}?: {select_ty} | false;")?;
            }
        }
        writeln!(dest, "}};")?;
        Ok(())
    }

    fn selection_for_function(&self, output_ty: u32, renderer: &TypeRenderer) -> String {
        match renderer.nodes[output_ty as usize].deref() {
            TypeNode::Boolean { .. }
            | TypeNode::Float { .. }
            | TypeNode::Integer { .. }
            | TypeNode::String { .. }
            | TypeNode::File { .. } => {
                let arg_ty = self.arg_ty_names.get(&output_ty).unwrap();
                format!("ScalarSelectArgs[{arg_ty}]")
            },
            TypeNode::Object { .. } => {
                let arg_ty = self.arg_ty_names.get(&output_ty).unwrap();
                format!("CompositSelectArgs[{arg_ty}]")
            },
            TypeNode::Optional { data: OptionalTypeData { item, .. }, .. }
            | TypeNode::List { data: ListTypeData { items: item, .. }, .. } 
            => {
                self.selection_for_function(*item, renderer)
            },
            TypeNode::Union { .. } | TypeNode::Either { .. } => todo!("unions are wip"),
            TypeNode::Function { .. } => unreachable!("A function can not return a function"),
            TypeNode::Any { .. } => unimplemented!("Any type support not implemented"),
        }
    }
}

impl RenderType for TsNodeSelectionsRenderer {
    fn render(
        &self,
        renderer: &mut TypeRenderer,
        cursor: &mut VisitCursor,
    ) -> anyhow::Result<String> {
        use heck::ToPascalCase;

        let name = match cursor.node.clone().deref() {
            TypeNode::Boolean { .. }
            | TypeNode::Float { .. }
            | TypeNode::Integer { .. }
            | TypeNode::String { .. }
            | TypeNode::File { .. } => "ScalarSelectNoArgs".to_string(),
            TypeNode::Any { .. } => unimplemented!("Any type support not implemented"),
            TypeNode::Optional { data: OptionalTypeData { item, .. }, .. }
            | TypeNode::List { data: ListTypeData { items: item, .. }, .. } 
                => renderer.render_subgraph(*item, cursor)?.0.unwrap().to_string(),
            | TypeNode::Function { data:FunctionTypeData { output, .. }, .. }
                => self.selection_for_function(*output, renderer),
            TypeNode::Object { data, base } => {
                let props = data
                    .properties
                    .iter()
                    // generate property types first
                    .map(|(name, &dep_id)| {
                        let (select_ty, arg_ty) = match renderer.nodes[dep_id as usize].deref() {
                            TypeNode::Union { .. }
                            | TypeNode::Either { .. } => todo!("unions are wip"),
                            TypeNode::Function { data, .. } => {
                                let arg_ty = self.arg_ty_names.get(&data.input).unwrap().clone();
                                let (out_ty, _) = renderer.render_subgraph(data.output, cursor)?;
                                let out_ty = out_ty.unwrap();
                                (out_ty, Some(arg_ty))
                            },
                            _ =>  {
                                let (select_t, _) = renderer.render_subgraph(dep_id, cursor)?;
                                let out_ty = select_t.unwrap();
                                (out_ty, None)
                            }
                        };
                        eyre::Ok((name.clone(), (select_ty,arg_ty)))
                    })
                    .collect::<Result<IndexMap<_, _>, _>>()?;
                let node_name = &base.title;
                let ty_name = normalize_type_title(node_name);
                let ty_name = format!("{ty_name}Selections").to_pascal_case();
                self.render_for_object(renderer, &ty_name, props)?;
                format!("CompositSelectNoArgs[{ty_name}]")
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
