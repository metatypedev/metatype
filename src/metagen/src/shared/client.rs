// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;

use super::files::{get_path_to_files, ObjectPath};
use super::types::*;
use common::typegraph::{EffectType, ListTypeData, OptionalTypeData};

pub struct RenderManifest {
    pub return_types: HashSet<u32>,
    pub arg_types: HashSet<u32>,
    pub node_metas: HashSet<u32>,
    pub selections: HashSet<u32>,
    pub root_fns: Vec<RootFn>,
    pub files: Rc<HashMap<u32, Vec<ObjectPath>>>,
}

pub struct RootFn {
    pub id: u32,
    pub name: String,
    pub in_id: Option<u32>,
    pub out_id: u32,
    pub effect: EffectType,
    pub select_ty: Option<u32>,
}

/// Collect upfront all the items we need to render
pub fn get_manifest(tg: &Typegraph) -> Result<RenderManifest> {
    let mut root_fns = vec![];
    let mut selections = HashSet::new();
    let mut return_types = HashSet::new();
    let mut node_metas = HashSet::new();
    let mut arg_types = HashSet::new();

    let (_root_base, root) = tg.root().map_err(anyhow_to_eyre!())?;
    for (key, &func_id) in &root.properties {
        let TypeNode::Function { data, .. } = &tg.types[func_id as usize] else {
            bail!(
                "invalid typegraph: node of type {} instead of a root function",
                tg.types[func_id as usize].type_name()
            );
        };
        let mat = &tg.materializers[data.materializer as usize];

        node_metas.insert(func_id);
        return_types.insert(data.output);
        root_fns.push(RootFn {
            id: func_id,
            name: key.clone(),
            effect: mat.effect.effect.unwrap_or(EffectType::Read),
            out_id: data.output,
            // empty struct arguments don't need arguments
            in_id: if matches!(
                &tg.types[data.input as usize],
                TypeNode::Object { data, .. } if !data.properties.is_empty()
            ) {
                arg_types.insert(data.input);
                Some(data.input)
            } else {
                None
            },
            // scalar return types don't need selections
            select_ty: if super::is_composite(&tg.types, data.output) {
                node_metas.insert(func_id);
                selections.insert(func_id);
                Some(data.output)
            } else {
                None
            },
        });
    }

    for node in &tg.types {
        if let TypeNode::Function { data, .. } = node {
            if matches!(
                &tg.types[data.input as usize],
                TypeNode::Object { data, .. } if !data.properties.is_empty()
            ) {
                arg_types.insert(data.input);
            }
        }
    }

    Ok(RenderManifest {
        root_fns,
        selections,
        return_types,
        node_metas,
        arg_types,
        files: get_path_to_files(tg, 0)?.into(),
    })
}

pub enum SelectionTy {
    Scalar,
    ScalarArgs { arg_ty: Rc<str> },
    Composite { select_ty: Rc<str> },
    CompositeArgs { arg_ty: Rc<str>, select_ty: Rc<str> },
}

pub fn selection_for_field(
    ty: u32,
    arg_ty_names: &NameMemo,
    renderer: &mut TypeRenderer,
    cursor: &mut VisitCursor,
) -> Result<SelectionTy> {
    let node = renderer.nodes[ty as usize].clone();
    Ok(match &node.deref() {
        TypeNode::Boolean { .. }
        | TypeNode::Float { .. }
        | TypeNode::Integer { .. }
        | TypeNode::String { .. }
        | TypeNode::File { .. } => SelectionTy::Scalar,
        TypeNode::Function { data, .. } => {
            let arg_ty = if !matches!(
                renderer.nodes[data.input as usize].deref(),
                TypeNode::Object { data, .. } if data.properties.is_empty()
            ) {
                Some(arg_ty_names.get(&data.input).unwrap().clone())
            } else {
                None
            };
            match (
                arg_ty,
                selection_for_field(data.output, arg_ty_names, renderer, cursor)?,
            ) {
                (None, SelectionTy::Scalar) => SelectionTy::Scalar,
                (Some(arg_ty), SelectionTy::Scalar) => SelectionTy::ScalarArgs { arg_ty },
                (None, SelectionTy::Composite { select_ty }) => {
                    SelectionTy::Composite { select_ty }
                }
                (Some(arg_ty), SelectionTy::Composite { select_ty }) => {
                    SelectionTy::CompositeArgs { select_ty, arg_ty }
                }
                (_, SelectionTy::CompositeArgs { .. }) | (_, SelectionTy::ScalarArgs { .. }) => {
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
        } => selection_for_field(*item, arg_ty_names, renderer, cursor)?,
        TypeNode::Object { .. } => SelectionTy::Composite {
            select_ty: renderer.render_subgraph(ty, cursor)?.0.unwrap(),
        },
        TypeNode::Either {
            data: common::typegraph::EitherTypeData { one_of: variants },
            ..
        }
        | TypeNode::Union {
            data: common::typegraph::UnionTypeData { any_of: variants },
            ..
        } => {
            let select_ty = renderer.render_subgraph(ty, cursor)?.0.unwrap();
            match selection_for_field(variants[0], arg_ty_names, renderer, cursor)? {
                SelectionTy::Scalar => SelectionTy::Scalar,
                SelectionTy::Composite { .. } => SelectionTy::Composite { select_ty },
                SelectionTy::CompositeArgs { .. } | SelectionTy::ScalarArgs { .. } => {
                    unreachable!("function can not be a union/either member")
                }
            }
        }
        TypeNode::Any { .. } => unimplemented!("Any type support not implemented"),
    })
}
