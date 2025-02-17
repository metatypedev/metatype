// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;

use crate::interlude::*;

use super::{
    files::{get_path_to_files, TypePath},
    types::*,
};
use indexmap::IndexSet;
use typegraph::{FunctionType, TypeNodeExt as _, Wrap as _};

pub struct RenderManifest {
    pub return_types: IndexSet<Arc<str>>,
    pub arg_types: IndexSet<Arc<str>>,
    pub node_metas: IndexSet<Arc<str>>, // what
    pub selections: IndexSet<Arc<str>>,
    pub root_fns: Vec<RootFn>,
    pub input_files: Arc<HashMap<u32, Vec<TypePath>>>,
}

pub struct RootFn {
    pub type_: Arc<FunctionType>,
    pub select_ty: Option<Arc<str>>,
}

/// Collect upfront all the items we need to render
pub fn get_manifest(tg: &Typegraph) -> Result<RenderManifest> {
    let mut root_fns = vec![];
    let mut selections = IndexSet::new();
    let mut return_types = IndexSet::new();
    let mut node_metas = IndexSet::new();
    let mut arg_types = IndexSet::new();

    for func in tg.root_functions() {
        node_metas.insert(func.name()); // FIXME
        let out_name = func.output().name();
        return_types.insert(out_name.clone());
        let select_ty = if func.output().is_composite() {
            node_metas.insert(out_name.clone());
            selections.insert(out_name.clone());
            Some(func.output().name())
        } else {
            None
        };
        root_fns.push(RootFn {
            type_: func,
            select_ty,
        })
    }

    for func in tg.functions.values() {
        arg_types.insert(func.input().name());
    }

    Ok(RenderManifest {
        root_fns,
        selections,
        return_types,
        node_metas,
        arg_types,
        input_files: get_path_to_files(&tg.root.clone().wrap())?.into(),
    })
}

pub enum SelectionTy {
    Scalar,
    ScalarArgs {
        arg_ty: Arc<str>,
    },
    Composite {
        select_ty: Arc<str>,
    },
    CompositeArgs {
        arg_ty: Arc<str>,
        select_ty: Arc<str>,
    },
}

pub fn selection_for_field(
    ty: &Type,
    arg_ty_names: &NameMemo,
    renderer: &mut TypeRenderer,
    cursor: &mut VisitCursor,
) -> Result<SelectionTy> {
    Ok(match ty {
        Type::Boolean(_) | Type::Float(_) | Type::Integer(_) | Type::String(_) | Type::File(_) => {
            SelectionTy::Scalar
        }
        Type::Function(t) => {
            let arg_ty = if !t.input().properties().is_empty() {
                // FIXME
                Some(arg_ty_names.get(&t.input().name()).unwrap().clone())
            } else {
                None
            };
            match (
                arg_ty,
                selection_for_field(t.output(), arg_ty_names, renderer, cursor)?,
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

        Type::Optional(t) => selection_for_field(t.item(), arg_ty_names, renderer, cursor)?,
        Type::List(t) => selection_for_field(t.item(), arg_ty_names, renderer, cursor)?,
        Type::Object(t) => SelectionTy::Composite {
            select_ty: renderer.render_subgraph(&t.wrap(), cursor)?.0.unwrap(),
        },
        Type::Union(t) => {
            let select_ty = renderer.render_subgraph(&t.wrap(), cursor)?.0.unwrap();
            let variants = t.variants();
            match selection_for_field(&variants[0], arg_ty_names, renderer, cursor)? {
                SelectionTy::Scalar => SelectionTy::Scalar,
                SelectionTy::Composite { .. } => SelectionTy::Composite { select_ty },
                SelectionTy::CompositeArgs { .. } | SelectionTy::ScalarArgs { .. } => {
                    unreachable!("function can not be a union/either member")
                }
            }
        }
    })
}
