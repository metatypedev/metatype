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
    fn render_for_struct(
        &self,
        dest: &mut impl Write,
        ty_name: &str,
        props: IndexMap<String, SelectionTy>,
    ) -> std::fmt::Result {
        // derive prop
        writeln!(dest, "#[derive(Default, Debug)]")?;
        writeln!(dest, "pub struct {ty_name}<ATy = NoAlias> {{")?;
        for (name, select_ty) in &props {
            use SelectionTy::*;
            match select_ty {
                Scalar => writeln!(dest, r#"    pub {name}: ScalarSelect<ATy>,"#)?,
                ScalarArgs { arg_ty } => {
                    writeln!(dest, r#"    pub {name}: ScalarSelectArgs<{arg_ty}, ATy>,"#)?
                }
                Composite { select_ty } => writeln!(
                    dest,
                    r#"    pub {name}: CompositeSelect<{select_ty}<ATy>, ATy>,"#
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
    fn render_for_union(
        &self,
        dest: &mut impl Write,
        ty_name: &str,
        props: IndexMap<String, (String, SelectionTy)>,
    ) -> std::fmt::Result {
        // derive prop
        writeln!(dest, "#[derive(Default, Debug)]")?;
        writeln!(dest, "pub struct {ty_name}<ATy = NoAlias> {{")?;
        for (name, (_variant_ty, select_ty)) in &props {
            use SelectionTy::*;
            match select_ty {
                Scalar | ScalarArgs { .. } => {
                    // scalars always get selected if the union node
                    // gets selected
                    unreachable!()
                }
                Composite { select_ty } => writeln!(
                    dest,
                    r#"    pub {name}: CompositeSelect<{select_ty}<ATy>, NoAlias>,"#
                )?,
                CompositeArgs { arg_ty, select_ty } => writeln!(
                    dest,
                    r#"    pub {name}: CompositeSelectArgs<{arg_ty}, {select_ty}<ATy>, NoAlias>,"#
                )?,
            };
        }
        writeln!(dest, "}}")?;
        write!(dest, "impl_union_selection_traits!({ty_name}")?;
        for (name, (variant_ty, _)) in props.iter() {
            write!(dest, r#", ("{variant_ty}", {name})"#)?;
        }
        writeln!(dest, r#");"#)?;
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
            TypeNode::Optional {
                data: OptionalTypeData { item, .. },
                ..
            }
            | TypeNode::List {
                data: ListTypeData { items: item, .. },
                ..
            }
            | TypeNode::Function {
                data: FunctionTypeData { output: item, .. },
                ..
            } => renderer
                .render_subgraph(*item, cursor)?
                .0
                .unwrap()
                .to_string(),
            TypeNode::Object { data, base } => {
                let props = data
                    .properties
                    .iter()
                    // generate property types first
                    .map(|(name, &dep_id)| {
                        eyre::Ok((
                            normalize_struct_prop_name(name),
                            selection_for_field(dep_id, &self.arg_ty_names, renderer, cursor)?,
                        ))
                    })
                    .collect::<Result<IndexMap<_, _>, _>>()?;
                let node_name = &base.title;
                let ty_name = normalize_type_title(node_name);
                let ty_name = format!("{ty_name}Selections").to_pascal_case();
                self.render_for_struct(renderer, &ty_name, props)?;
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
                    .filter_map(|&inner| {
                        if !renderer.is_composite(inner) {
                            return None;
                        }
                        let ty_name = renderer.nodes[inner as usize].deref().base().title.clone();
                        let struct_prop_name =
                            normalize_struct_prop_name(&normalize_type_title(&ty_name[..]));

                        let selection = match selection_for_field(
                            inner,
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
                let ty_name = normalize_type_title(&base.title);
                let ty_name = format!("{ty_name}Selections").to_pascal_case();
                self.render_for_union(renderer, &ty_name, variants)?;
                ty_name
            }
        };
        Ok(name)
    }
}
