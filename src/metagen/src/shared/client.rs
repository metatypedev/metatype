// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;

use crate::{interlude::*, shared::get_gql_type};

use super::files::TypePath;
use indexmap::IndexSet;
use typegraph::FunctionType;

/// get the types that could be referenced in the GraphQL queries
pub fn get_gql_types(tg: &Typegraph) -> IndexMap<TypeKey, String> {
    let mut res: IndexMap<TypeKey, _> = Default::default();

    // top level input types for variables
    for (_idx, func) in tg.functions.iter() {
        let inp_type = func.input();
        let props = inp_type.properties();
        res.reserve(props.len());
        for prop in props.values() {
            let gql_ty = get_gql_type(&prop.ty, prop.as_id, false);
            res.insert(prop.ty.key(), gql_ty);
        }
    }

    // non scalar union variants for type selection
    for ty in tg.output_types.values() {
        if let Type::Union(ty) = ty {
            for variant in ty.variants() {
                if variant.is_composite() {
                    res.insert(variant.key(), get_gql_type(variant, false, false));
                }
            }
        }
    }

    res
}

pub struct RenderManifest {
    pub tg: Arc<Typegraph>,
    pub node_metas: IndexSet<TypeKey>,
    pub selections: IndexSet<TypeKey>,
    pub root_fns: Vec<RootFn>,
    pub input_files: Arc<HashMap<u32, Vec<TypePath>>>,
}

pub struct RootFn {
    pub path: Vec<Arc<str>>, // non empty
    pub type_: Arc<FunctionType>,
    pub select_ty: Option<TypeKey>,
}

/// Collect upfront all the items we need to render
pub fn get_manifest(tg: Arc<Typegraph>) -> Result<RenderManifest> {
    let mut root_fns = vec![];
    let mut selections = IndexSet::new();
    let mut node_metas = IndexSet::new();
    let mut arg_types = IndexSet::new();

    for root_fn in tg.root_functions() {
        let (path, func) = root_fn?;
        let _ = node_metas.insert(func.key());
        let out = func.output();
        let out_key = out.key();
        // return_types.insert(out_name.clone());

        let select_ty = if func.output().is_composite() {
            let _ = node_metas.insert(out_key);
            selections.insert(out_key);
            Some(out_key)
        } else {
            None
        };
        root_fns.push(RootFn {
            path,
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
        node_metas,
        tg: tg.clone(),
        // input_files: get_path_to_files(&tg)?.into(),
        input_files: Default::default(),
    })
}

#[derive(Debug)]
pub enum SelectionTy {
    Scalar,
    ScalarArgs { arg_ty: TypeKey },
    Composite { select_ty: TypeKey },
    CompositeArgs { arg_ty: TypeKey, select_ty: TypeKey },
}

pub fn selection_for_field(ty: &Type) -> SelectionTy {
    match ty {
        Type::Boolean(_) | Type::Float(_) | Type::Integer(_) | Type::String(_) | Type::File(_) => {
            SelectionTy::Scalar
        }
        Type::Function(t) => {
            let arg_ty = if !t.input().properties().is_empty() {
                Some(t.input().key())
            } else {
                None
            };
            match (arg_ty, selection_for_field(t.output())) {
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

        Type::Optional(t) => selection_for_field(t.item()),
        Type::List(t) => selection_for_field(t.item()),
        Type::Object(t) => SelectionTy::Composite { select_ty: t.key() },
        Type::Union(t) => {
            let variants = t.variants();
            match selection_for_field(&variants[0]) {
                SelectionTy::Scalar => SelectionTy::Scalar,
                SelectionTy::Composite { .. } => SelectionTy::Composite { select_ty: t.key() },
                SelectionTy::CompositeArgs { .. } | SelectionTy::ScalarArgs { .. } => {
                    unreachable!("function can not be a union/either member")
                }
            }
        }
    }
}
