// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::Write;

use common::typegraph::*;

use super::utils::*;
use crate::{interlude::*, shared::client::*, shared::types::*};

pub struct RsNodeSelectionsRenderer {
    pub arg_ty_names: Rc<NameMemo>,
}

impl RsNodeSelectionsRenderer {
    /// `props` is a map of prop_name -> (SelectionType, ArgumentType)
    fn render_for_object(
        &self,
        dest: &mut impl Write,
        ty_name: &str,
        props: IndexMap<String, SelectionTy>,
    ) -> std::fmt::Result {
        // derive prop
        write!(dest, "#[derive(Default, Debug)]")?;
        writeln!(dest, "pub struct {ty_name}<ATy = NoAlias> {{")?;
        for (name, select_ty) in &props {
            use SelectionTy::*;
            match select_ty {
                Scalar => writeln!(dest, r#"    pub {name}: ScalarSelectNoArgs<ATy>,"#)?,
                ScalarArgs { arg_ty } => {
                    writeln!(dest, r#"    pub {name}: ScalarSelectArgs<{arg_ty}, ATy>,"#)?
                }
                Composite { select_ty } => writeln!(
                    dest,
                    r#"    pub {name}: CompositeSelectNoArgs<{select_ty}<ATy>, ATy>,"#
                )?,
                CompositeArgs { arg_ty, select_ty } => writeln!(
                    dest,
                    r#"    pub {name}: CompositeSelectArgs<{arg_ty}, {select_ty}<ATy>, ATy>,"#
                )?,
            };
        }
        writeln!(dest, "}}")?;
        write!(dest, "impl_selection_traits!({ty_name}, ")?;
        let len = props.len();
        for (idx, (name, _)) in props.iter().enumerate() {
            if idx < len - 1 {
                write!(dest, "{name}, ")?;
            } else {
                writeln!(dest, "{name});")?;
            }
        }
        Ok(())
    }
}

impl RenderType for RsNodeSelectionsRenderer {
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
            | TypeNode::File { .. } => unreachable!("scalars don't get to have selections"),
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
