// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;

use super::types::*;
use common::typegraph::{
    visitor::{
        CurrentNode, DefaultLayer, Edge, PathSegment, TypeVisitor, TypeVisitorContext, VisitResult,
        VisitorResult,
    },
    EffectType, ListTypeData, OptionalTypeData,
};

pub struct RenderManifest {
    pub return_types: HashSet<u32>,
    pub arg_types: HashSet<u32>,
    pub node_metas: HashSet<u32>,
    pub selections: HashSet<u32>,
    pub root_fns: Vec<RootFn>,
}

pub struct RootFn {
    pub id: u32,
    pub name: String,
    pub in_id: Option<u32>,
    pub out_id: u32,
    pub effect: EffectType,
    pub select_ty: Option<u32>,
    pub in_files: Vec<ObjectPath>,
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
            in_files: get_path_to_files(tg, data.input)?,
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

/// Access path into a nested value in an object, more or less like JsonPath
#[derive(Debug)]
pub struct ObjectPath(pub Vec<ObjectPathSegment>);

#[derive(Debug)]
pub enum ObjectPathSegment {
    Optional,
    List,
    Field(String),
}

impl std::fmt::Display for ObjectPathSegment {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ObjectPathSegment::Optional => write!(f, "?"),
            ObjectPathSegment::List => write!(f, "[]"),
            ObjectPathSegment::Field(key) => write!(f, ".{}", key),
        }
    }
}

impl<'a> TryFrom<&'a PathSegment<'a>> for ObjectPathSegment {
    type Error = anyhow::Error;

    fn try_from(seg: &'a PathSegment<'a>) -> anyhow::Result<Self> {
        match seg.edge {
            Edge::ObjectProp(key) => Ok(Self::Field(key.to_string())),
            Edge::ArrayItem => Ok(Self::List),
            Edge::OptionalItem => Ok(Self::Optional),
            Edge::FunctionInput => bail!("unexpected path segment for file input"),
            Edge::FunctionOutput => bail!("unexpected path segment for file input"),
            Edge::UnionVariant(_) | Edge::EitherVariant(_) => {
                bail!("file input is not supported for polymorphic types (union/either)")
            }
        }
    }
}

impl<'a> TryFrom<&'a [PathSegment<'a>]> for ObjectPath {
    type Error = anyhow::Error;

    fn try_from(path: &'a [PathSegment<'a>]) -> anyhow::Result<Self> {
        Ok(Self(
            path.iter()
                .map(ObjectPathSegment::try_from)
                .collect::<Result<_, _>>()?,
        ))
    }
}

struct Output(anyhow::Result<Vec<ObjectPath>>);

#[derive(Debug, Clone)]
struct FileCollectorContext<'a> {
    typegraph: &'a Typegraph,
}

#[derive(Debug, Default)]
struct FileCollector {
    files: Vec<ObjectPath>,
}

impl<'a> TypeVisitorContext for FileCollectorContext<'a> {
    fn get_typegraph(&self) -> &Typegraph {
        self.typegraph
    }
}

impl VisitorResult for Output {
    fn from_error(_path: String, _msg: String) -> Self {
        Output(Err(anyhow::anyhow!("error"))) // TODO format error
    }
}

impl<'a> TypeVisitor<'a> for FileCollector {
    type Return = Output;
    type Context = FileCollectorContext<'a>;

    fn visit(
        &mut self,
        current_node: CurrentNode<'_>,
        _cx: &Self::Context,
    ) -> VisitResult<Self::Return> {
        match current_node.type_node {
            TypeNode::File { .. } => {
                let path = match current_node.path.try_into() {
                    Ok(path) => path,
                    Err(e) => return VisitResult::Return(Output(Err(e))),
                };
                self.files.push(path);
                VisitResult::Continue(false)
            }
            _ => VisitResult::Continue(true),
        }
    }

    fn take_result(&mut self) -> Option<Self::Return> {
        Some(Output(Ok(std::mem::take(&mut self.files))))
    }
}

fn get_path_to_files(tg: &Typegraph, root: u32) -> Result<Vec<ObjectPath>> {
    let cx = FileCollectorContext { typegraph: tg };
    Ok(tg
        .traverse_types(FileCollector::default(), &cx, DefaultLayer, root)
        .map(|x| x.0)
        .transpose()?
        .unwrap_or_else(Default::default))
}
