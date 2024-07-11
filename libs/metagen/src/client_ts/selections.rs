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
        writeln!(
            dest,
            "export type {ty_name} = {{
  _?: SelectionFlags;"
        )?;
        for (name, (select_ty, arg_ty)) in props {
            if let Some(arg_ty) = arg_ty {
                if &select_ty[..] == "boolean" {
                    // just providing the argument is enough to signal selection
                    writeln!(dest, "  {name}:?: {arg_ty};")?;
                } else {
                    // we need to allow false to allow explicit disabling
                    // when the select all flag is set
                    writeln!(dest, "  {name}?: [{arg_ty}, {select_ty}] | false;")?;
                }
            } else if &select_ty[..] == "boolean" {
                writeln!(dest, "  {name}?: {select_ty};")?;
            } else {
                writeln!(dest, "  {name}?: {select_ty} | false;")?;
            }
        }
        writeln!(dest, "}};")?;
        Ok(())
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
            | TypeNode::File { .. } => "boolean".to_string(),
            TypeNode::Any { .. } => unimplemented!("Any type support not implemented"),
            TypeNode::Optional { data: OptionalTypeData { item, .. }, .. }
            | TypeNode::List { data: ListTypeData { items: item, .. }, .. }
            | TypeNode::Function { data:FunctionTypeData { output:item,.. }, .. }
                => renderer.render_subgraph(*item, cursor)?.0.unwrap().to_string(),
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
                // let variants = variants
                //     .iter()
                //     .map(|&inner| {
                //         let (ty_name, _cyclic) = renderer.render_subgraph(inner, cursor)?;
                //         let ty_name = match ty_name {
                //             RenderedName::Name(name) => name,
                //             RenderedName::Placeholder(name) => name,
                //         };
                //         Ok::<_, anyhow::Error>(ty_name)
                //     })
                //     .collect::<Result<Vec<_>, _>>()?;
                // let ty_name = normalize_type_title(&base.title);
                // self.render_union_type(renderer, &ty_name, variants)?;
                // ty_name
                todo!("unions are wip")
            }
        };
        Ok(name)
    }
}
