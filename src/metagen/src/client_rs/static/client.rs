// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{collections::HashMap, marker::PhantomData};

use reqwest::Url;
use serde::{Deserialize, Serialize};

pub type CowStr = std::borrow::Cow<'static, str>;
pub type BoxErr = Box<dyn std::error::Error + Send + Sync>;
pub type JsonObject = serde_json::Map<String, serde_json::Value>;

fn to_json_value<T: Serialize>(val: T) -> serde_json::Value {
    serde_json::to_value(val).expect("error serializing value")
}

/// Build the SelectNodeErased tree from the SelectionErasedMap tree
/// according to the NodeMeta tree. In this function
/// - arguments are associated with their types
/// - aliases get splatted into the node tree
/// - light query validation takes place
fn selection_to_node_set(
    selection: SelectionErasedMap,
    metas: &HashMap<CowStr, NodeMetaFn>,
    parent_path: String,
) -> Result<Vec<SelectNodeErased>, SelectionError> {
    let mut out = vec![];
    let mut selection = selection.0;
    let mut found_nodes = selection
        .keys()
        .cloned()
        .collect::<std::collections::HashSet<_>>();
    for (node_name, meta_fn) in metas.iter() {
        found_nodes.remove(&node_name[..]);

        let Some(node_selection) = selection.remove(&node_name[..]) else {
            // this node was not selected
            continue;
        };

        let node_instances = match node_selection {
            SelectionErased::None => continue,
            SelectionErased::Scalar => vec![(node_name.clone(), NodeArgsErased::None, None)],
            SelectionErased::ScalarArgs(args) => {
                vec![(node_name.clone(), args, None)]
            }
            SelectionErased::Composite(select) => {
                vec![(node_name.clone(), NodeArgsErased::None, Some(select))]
            }
            SelectionErased::CompositeArgs(args, select) => {
                vec![(node_name.clone(), args, Some(select))]
            }
            SelectionErased::Alias(aliases) => aliases
                .into_iter()
                .map(|(instance_name, selection)| {
                    let (args, select) = match selection {
                        AliasSelection::Scalar => (NodeArgsErased::None, None),
                        AliasSelection::ScalarArgs(args) => (args, None),
                        AliasSelection::Composite(select) => (NodeArgsErased::None, Some(select)),
                        AliasSelection::CompositeArgs(args, select) => (args, Some(select)),
                    };
                    (instance_name, args, select)
                })
                .collect(),
        };

        let meta = meta_fn();
        for (instance_name, args, select) in node_instances {
            let args = if let Some(arg_types) = &meta.arg_types {
                match args {
                    NodeArgsErased::Inline(args) => {
                        let instance_args = check_node_args(args, arg_types).map_err(|name| {
                            SelectionError::UnexpectedArgs {
                                name,
                                path: format!("{parent_path}.{instance_name}"),
                            }
                        })?;
                        Some(NodeArgsMerged::Inline(instance_args))
                    }
                    NodeArgsErased::Placeholder(ph) => Some(NodeArgsMerged::Placeholder {
                        value: ph,
                        // FIXME: this clone can be improved
                        arg_types: arg_types.clone(),
                    }),
                    NodeArgsErased::None => {
                        return Err(SelectionError::MissingArgs {
                            path: format!("{parent_path}.{instance_name}"),
                        })
                    }
                }
            } else {
                None
            };
            let sub_nodes = match (&meta.variants, &meta.sub_nodes) {
                (Some(_), Some(_)) => unreachable!("union/either types can't have sub_nodes"),
                (None, None) => SubNodes::None,
                (variants, sub_nodes) => {
                    let Some(select) = select else {
                        return Err(SelectionError::MissingSubNodes {
                            path: format!("{parent_path}.{instance_name}"),
                        });
                    };
                    match select {
                        CompositeSelection::Atomic(select) => {
                            let Some(sub_nodes) = sub_nodes else {
                                return Err(SelectionError::UnexpectedUnion {
                                    path: format!("{parent_path}.{instance_name}"),
                                });
                            };
                            SubNodes::Atomic(selection_to_node_set(
                                select,
                                sub_nodes,
                                format!("{parent_path}.{instance_name}"),
                            )?)
                        }
                        CompositeSelection::Union(variant_select) => {
                            let Some(variants) = variants else {
                                return Err(SelectionError::MissingUnion {
                                    path: format!("{parent_path}.{instance_name}"),
                                });
                            };
                            let mut out = HashMap::new();
                            for (variant_ty, select) in variant_select {
                                let Some(variant_meta) = variants.get(&variant_ty[..]) else {
                                    return Err(SelectionError::UnexpectedVariant {
                                        path: format!("{parent_path}.{instance_name}"),
                                        varaint_ty: variant_ty.clone(),
                                    });
                                };
                                let variant_meta = variant_meta();
                                // this union member is a scalar
                                let Some(sub_nodes) = variant_meta.sub_nodes else {
                                    continue;
                                };
                                let nodes = selection_to_node_set(
                                    select,
                                    &sub_nodes,
                                    format!("{parent_path}.{instance_name}"),
                                )?;
                                out.insert(variant_ty, nodes);
                            }
                            SubNodes::Union(out)
                        }
                    }
                }
            };

            out.push(SelectNodeErased {
                node_name: node_name.clone(),
                instance_name,
                args,
                sub_nodes,
            })
        }
    }
    Ok(out)
}

#[derive(Debug)]
pub enum SelectionError {
    MissingArgs { path: String },
    MissingSubNodes { path: String },
    MissingUnion { path: String },
    UnexpectedArgs { path: String, name: String },
    UnexpectedUnion { path: String },
    UnexpectedVariant { path: String, varaint_ty: CowStr },
}

impl std::fmt::Display for SelectionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SelectionError::MissingArgs { path } => write!(f, "args are missing at node {path}"),
            SelectionError::UnexpectedArgs { path, name } => {
                write!(f, "unexpected arg '${name}' at node {path}")
            }
            SelectionError::MissingSubNodes { path } => {
                write!(f, "node at {path} is a composite but no selection found")
            }
            SelectionError::MissingUnion { path } => write!(
                f,
                "node at {path} is a union but provided selection is atomic"
            ),
            SelectionError::UnexpectedUnion { path } => write!(
                f,
                "node at {path} is an atomic type but union selection provided"
            ),
            SelectionError::UnexpectedVariant { path, varaint_ty } => {
                write!(f, "node at {path} has no variant called '{varaint_ty}'")
            }
        }
    }
}
impl std::error::Error for SelectionError {}

//
// --- --- Graph node types  --- --- //
//

type NodeMetaFn = fn() -> NodeMeta;

/// How the [`node_metas`] module encodes the description
/// of the typegraph.
struct NodeMeta {
    sub_nodes: Option<HashMap<CowStr, NodeMetaFn>>,
    arg_types: Option<HashMap<CowStr, CowStr>>,
    variants: Option<HashMap<CowStr, NodeMetaFn>>,
}

enum SubNodes {
    None,
    Atomic(Vec<SelectNodeErased>),
    Union(HashMap<CowStr, Vec<SelectNodeErased>>),
}

/// The final form of the nodes used in queries.
pub struct SelectNodeErased {
    node_name: CowStr,
    instance_name: CowStr,
    args: Option<NodeArgsMerged>,
    sub_nodes: SubNodes,
}

/// Wrappers around [`SelectNodeErased`] that only holds query nodes
pub struct QueryNode<Out>(SelectNodeErased, PhantomData<(Out,)>);
/// Wrappers around [`SelectNodeErased`] that only holds mutation nodes
pub struct MutationNode<Out>(SelectNodeErased, PhantomData<(Out,)>);

/* /// Trait used to track the `Out` type parameter for [`QueryNode`]/[`MutationNode`]
pub trait ToSelectNode {
    type Out;

    fn erased(self) -> SelectNodeErased;
} */

/// A variation of [`ToSelectNode`] to only be implemented
/// by aggregates of select nodes like [Vec]s.
pub trait ToSelectDoc {
    type Out;

    fn to_select_doc(self) -> Vec<SelectNodeErased>;
    fn parse_response(data: Vec<serde_json::Value>) -> Result<Self::Out, serde_json::Error>;
}

/// Marker trait for [`ToSelectDoc`] implementors that only carry query nodes.
pub trait ToQueryDoc {}
/// Marker trait for [`ToSelectDoc`] implementors that only carry mutation nodes.
pub trait ToMutationDoc {}

/// Struct used to mark query associated types that are generic about effect.
pub struct QueryMarker;
/// Struct used to mark mutationo associated types that are generic about effect.
pub struct MutationMarker;

/// A node that's yet to have it's subnodes specified.
/// Use [`select`][Self::select] and [`select_aliased`][Self::select_aliased]
/// to finalize it.
/// [`select_aliased`][Self::select_aliased] will allow you to use [`alias`]
/// nodes but the returned object will be a raw [`serde_json::Value`].
/// This type is generic over effect using the `QTy` parameter.
pub struct UnselectedNode<SelT, SelAliasedT, QTy, Out> {
    root_name: CowStr,
    root_meta: NodeMetaFn,
    args: NodeArgsErased,
    _marker: PhantomData<(SelT, SelAliasedT, QTy, Out)>,
}

impl<SelT, SelAliased, QTy, Out> UnselectedNode<SelT, SelAliased, QTy, Out>
where
    SelT: Into<CompositeSelection>,
{
    fn select_erased(self, select: SelT) -> Result<SelectNodeErased, SelectionError> {
        let nodes = selection_to_node_set(
            SelectionErasedMap(
                [(
                    self.root_name.clone(),
                    match self.args {
                        NodeArgsErased::None => SelectionErased::Composite(select.into()),
                        args => SelectionErased::CompositeArgs(args, select.into()),
                    },
                )]
                .into(),
            ),
            &[(self.root_name, self.root_meta)].into(),
            "$q".into(),
        )?;
        Ok(nodes.into_iter().next().unwrap())
    }
}

impl<SelT, SelAliased, QTy, Out> UnselectedNode<SelT, SelAliased, QTy, Out>
where
    SelAliased: Into<CompositeSelection>,
{
    fn select_aliased_erased(self, select: SelAliased) -> Result<SelectNodeErased, SelectionError> {
        let nodes = selection_to_node_set(
            SelectionErasedMap(
                [(
                    self.root_name.clone(),
                    match self.args {
                        NodeArgsErased::None => SelectionErased::Composite(select.into()),
                        args => SelectionErased::CompositeArgs(args, select.into()),
                    },
                )]
                .into(),
            ),
            &[(self.root_name, self.root_meta)].into(),
            "$q".into(),
        )?;
        Ok(nodes.into_iter().next().unwrap())
    }
}

// NOTE: we'll need a select method implementation for each ATy x QTy pair

impl<SelT, SelAliased, Out> UnselectedNode<SelT, SelAliased, QueryMarker, Out>
where
    SelT: Into<CompositeSelection>,
{
    pub fn select(self, select: SelT) -> Result<QueryNode<Out>, SelectionError> {
        Ok(QueryNode(self.select_erased(select)?, PhantomData))
    }
}
impl<SelT, SelAliased, Out> UnselectedNode<SelT, SelAliased, QueryMarker, Out>
where
    SelAliased: Into<CompositeSelection>,
{
    pub fn select_aliased(
        self,
        select: SelAliased,
    ) -> Result<QueryNode<serde_json::Value>, SelectionError> {
        Ok(QueryNode(self.select_aliased_erased(select)?, PhantomData))
    }
}
impl<SelT, SelAliased, Out> UnselectedNode<SelT, SelAliased, MutationMarker, Out>
where
    SelT: Into<CompositeSelection>,
{
    pub fn select(self, select: SelT) -> Result<MutationNode<Out>, SelectionError> {
        Ok(MutationNode(self.select_erased(select)?, PhantomData))
    }
}
impl<SelT, SelAliased, Out> UnselectedNode<SelT, SelAliased, MutationMarker, Out>
where
    SelAliased: Into<CompositeSelection>,
{
    pub fn select_aliased(
        self,
        select: SelAliased,
    ) -> Result<MutationNode<serde_json::Value>, SelectionError> {
        Ok(MutationNode(
            self.select_aliased_erased(select)?,
            PhantomData,
        ))
    }
}

// --- --- Impl ToSelectDoc --- --- ///

impl<Out> ToSelectDoc for QueryNode<Out>
where
    Out: serde::de::DeserializeOwned,
{
    type Out = Out;

    fn to_select_doc(self) -> Vec<SelectNodeErased> {
        vec![self.0]
    }

    fn parse_response(data: Vec<serde_json::Value>) -> Result<Self::Out, serde_json::Error> {
        let mut data = data.into_iter();
        serde_json::from_value(data.next().unwrap())
    }
}
impl<Out> ToQueryDoc for QueryNode<Out> {}
impl<Out> ToSelectDoc for MutationNode<Out>
where
    Out: serde::de::DeserializeOwned,
{
    type Out = Out;

    fn to_select_doc(self) -> Vec<SelectNodeErased> {
        vec![self.0]
    }

    fn parse_response(data: Vec<serde_json::Value>) -> Result<Self::Out, serde_json::Error> {
        let mut data = data.into_iter();
        serde_json::from_value(data.next().unwrap())
    }
}
impl<Out> ToMutationDoc for MutationNode<Out> {}

#[macro_export]
macro_rules! impl_for_tuple {
    ($($idx:tt $ty:tt),+) => {
        impl<$($ty,)+> ToSelectDoc for ($(QueryNode<$ty>,)+)
            where $($ty: serde::de::DeserializeOwned,)+
        {
            type Out = ($($ty,)+);

            fn to_select_doc(self) -> Vec<SelectNodeErased> {
                vec![
                    $(self.$idx.0,)+
                ]
            }
            fn parse_response(data: Vec<serde_json::Value>) -> Result<Self::Out, serde_json::Error> {
                let mut data = data.into_iter();
                let mut next = move |_idx| data.next().unwrap();
                Ok((

                    $(serde_json::from_value(next($idx))?,)+
                ))
            }
        }
        impl<$($ty,)+> ToSelectDoc for ($(MutationNode<$ty>,)+)
            where $($ty: serde::de::DeserializeOwned,)+
        {
            type Out = ($($ty,)+);

            fn to_select_doc(self) -> Vec<SelectNodeErased> {
                vec![
                    $(self.$idx.0,)+
                ]
            }
            fn parse_response(data: Vec<serde_json::Value>) -> Result<Self::Out, serde_json::Error> {
                let mut data = data.into_iter();
                let mut next = move |_idx| data.next().unwrap();
                Ok((

                    $(serde_json::from_value(next($idx))?,)+
                ))
            }
        }

        impl<$($ty,)+> ToQueryDoc for ($($ty,)+)
        where
            $($ty: ToQueryDoc,)+
        {}

        impl<$($ty,)+> ToMutationDoc for ($($ty,)+)
        where
            $($ty: ToMutationDoc,)+
        {}
    };
}

impl_for_tuple!(0 N0);
impl_for_tuple!(0 N0, 1 N1);
impl_for_tuple!(0 N0, 1 N1, 2 N2);
impl_for_tuple!(0 N0, 1 N1, 2 N2, 3 N3);
impl_for_tuple!(0 N0, 1 N1, 2 N2, 3 N3, 4 N4);
impl_for_tuple!(0 N0, 1 N1, 2 N2, 3 N3, 4 N4, 5 N5);
impl_for_tuple!(0 N0, 1 N1, 2 N2, 3 N3, 4 N4, 5 N5, 6 N6);
impl_for_tuple!(0 N0, 1 N1, 2 N2, 3 N3, 4 N4, 5 N5, 6 N6, 7 N7);
impl_for_tuple!(0 N0, 1 N1, 2 N2, 3 N3, 4 N4, 5 N5, 6 N6, 7 N7, 8 N8);
impl_for_tuple!(0 N0, 1 N1, 2 N2, 3 N3, 4 N4, 5 N5, 6 N6, 7 N7, 8 N8, 9 N9);
impl_for_tuple!(0 N0, 1 N1, 2 N2, 3 N3, 4 N4, 5 N5, 6 N6, 7 N7, 8 N8, 9 N9, 10 N10);
impl_for_tuple!(0 N0, 1 N1, 2 N2, 3 N3, 4 N4, 5 N5, 6 N6, 7 N7, 8 N8, 9 N9, 10 N10, 11 N11);

//
// --- -- --- Selection types --- --- //
//

// This is a newtype for Into trait impl purposes
#[derive(Debug)]
pub struct SelectionErasedMap(HashMap<CowStr, SelectionErased>);

#[derive(Debug)]
pub enum CompositeSelection {
    Atomic(SelectionErasedMap),
    Union(HashMap<CowStr, SelectionErasedMap>),
}

impl Default for CompositeSelection {
    fn default() -> Self {
        CompositeSelection::Atomic(SelectionErasedMap(Default::default()))
    }
}

#[derive(Debug)]
enum SelectionErased {
    None,
    Scalar,
    ScalarArgs(NodeArgsErased),
    Composite(CompositeSelection),
    CompositeArgs(NodeArgsErased, CompositeSelection),
    Alias(HashMap<CowStr, AliasSelection>),
}

#[derive(Debug)]
pub enum AliasSelection {
    Scalar,
    ScalarArgs(NodeArgsErased),
    Composite(CompositeSelection),
    CompositeArgs(NodeArgsErased, CompositeSelection),
}

#[derive(Default, Clone, Copy, Debug)]
pub struct HasAlias;
#[derive(Default, Clone, Copy, Debug)]
pub struct NoAlias;

#[derive(Debug)]
pub struct AliasInfo<ArgT, SelT, ATyag> {
    aliases: HashMap<CowStr, AliasSelection>,
    _phantom: PhantomData<(ArgT, SelT, ATyag)>,
}

#[derive(Debug)]
pub enum ScalarSelect<ATy> {
    Get,
    Skip,
    Alias(AliasInfo<(), (), ATy>),
}
#[derive(Debug)]
pub enum ScalarSelectArgs<ArgT, ATy> {
    Get(NodeArgsErased, PhantomData<ArgT>),
    Skip,
    Alias(AliasInfo<ArgT, (), ATy>),
}
#[derive(Debug)]
pub enum CompositeSelect<SelT, ATy> {
    Get(CompositeSelection, PhantomData<SelT>),
    Skip,
    Alias(AliasInfo<(), SelT, ATy>),
}
#[derive(Debug)]
pub enum CompositeSelectArgs<ArgT, SelT, ATy> {
    Get(
        NodeArgsErased,
        CompositeSelection,
        PhantomData<(ArgT, SelT)>,
    ),
    Skip,
    Alias(AliasInfo<ArgT, SelT, ATy>),
}

pub struct Get;
pub struct Skip;
pub struct Args<ArgT>(ArgT);
pub struct Select<SelT>(SelT);
pub struct ArgSelect<ArgT, SelT>(ArgT, SelT);
pub struct Alias<ArgT, SelT>(AliasInfo<ArgT, SelT, HasAlias>);

/// Shorthand for `Default::default`. All selections generally default
/// to [`skip`].
pub fn default<T: Default>() -> T {
    T::default()
}
/// Include all sub nodes excpet those that require arguments
pub fn all<T: Selection>() -> T {
    T::all()
}
/// Select the node for inclusion.
pub fn get<T: From<Get>>() -> T {
    T::from(Get)
}
/// Skip this node when queryig.
pub fn skip<T: From<Skip>>() -> T {
    T::from(Skip)
}
/// Provide argumentns for a scalar node.
pub fn args<ArgT, T: From<Args<ArgT>>>(args: ArgT) -> T {
    T::from(Args(args))
}
/// Provide selections for a composite node that takes no args.
pub fn select<SelT, T: From<Select<SelT>>>(selection: SelT) -> T {
    T::from(Select(selection))
}
/// Provide arguments and selections for a composite node.
pub fn arg_select<ArgT, SelT, T: From<ArgSelect<ArgT, SelT>>>(args: ArgT, selection: SelT) -> T {
    T::from(ArgSelect(args, selection))
}

/// Query the same node multiple times using aliases.
///
/// WARNING: make sure your alias names don't clash across sibling
/// nodes.
pub fn alias<ArgT, SelT, ASelT, T, S>(info: impl Into<HashMap<S, ASelT>>) -> T
where
    S: Into<CowStr>,
    ASelT: Into<AliasSelection>,
    T: From<Alias<ArgT, SelT>> + FromAliasSelection<ASelT>,
{
    let info: HashMap<_, _> = info.into();
    T::from(Alias(AliasInfo {
        aliases: info
            .into_iter()
            .map(|(name, sel)| (name.into(), sel.into()))
            .collect(),
        _phantom: PhantomData,
    }))
}

pub trait Selection {
    /// Include all sub nodes excpet those that require arguments
    fn all() -> Self;
}

// --- Impl SelectionType impls --- //

impl<ATy> Selection for ScalarSelect<ATy> {
    fn all() -> Self {
        Self::Get
    }
}
impl<ArgT, ATy> Selection for ScalarSelectArgs<ArgT, ATy> {
    fn all() -> Self {
        Self::Skip
    }
}
impl<SelT, ATy> Selection for CompositeSelect<SelT, ATy>
where
    SelT: Selection + Into<CompositeSelection>,
{
    fn all() -> Self {
        let sel = SelT::all();
        Self::Get(sel.into(), PhantomData)
    }
}
impl<ArgT, SelT, ATy> Selection for CompositeSelectArgs<ArgT, SelT, ATy>
where
    SelT: Selection,
{
    fn all() -> Self {
        Self::Skip
    }
}
// --- Default impls --- //

impl<ATy> Default for ScalarSelect<ATy> {
    fn default() -> Self {
        Self::Skip
    }
}
impl<ArgT, ATy> Default for ScalarSelectArgs<ArgT, ATy> {
    fn default() -> Self {
        Self::Skip
    }
}
impl<SelT, ATy> Default for CompositeSelect<SelT, ATy> {
    fn default() -> Self {
        Self::Skip
    }
}
impl<ArgT, SelT, ATy> Default for CompositeSelectArgs<ArgT, SelT, ATy> {
    fn default() -> Self {
        Self::Skip
    }
}

// --- From Get/Skip...etc impls --- //

impl<ATy> From<Get> for ScalarSelect<ATy> {
    fn from(_: Get) -> Self {
        Self::Get
    }
}

impl<ATy> From<Skip> for ScalarSelect<ATy> {
    fn from(_: Skip) -> Self {
        Self::Skip
    }
}
impl<ArgT, ATy> From<Skip> for ScalarSelectArgs<ArgT, ATy> {
    fn from(_: Skip) -> Self {
        Self::Skip
    }
}
impl<SelT, ATy> From<Skip> for CompositeSelect<SelT, ATy> {
    fn from(_: Skip) -> Self {
        Self::Skip
    }
}
impl<ArgT, SelT, ATy> From<Skip> for CompositeSelectArgs<ArgT, SelT, ATy> {
    fn from(_: Skip) -> Self {
        Self::Skip
    }
}

impl<ArgT, ATy> From<Args<ArgT>> for ScalarSelectArgs<ArgT, ATy>
where
    ArgT: Serialize,
{
    fn from(Args(args): Args<ArgT>) -> Self {
        Self::Get(NodeArgsErased::Inline(to_json_value(args)), PhantomData)
    }
}

impl<SelT, ATy> From<Select<SelT>> for CompositeSelect<SelT, ATy>
where
    SelT: Into<CompositeSelection>,
{
    fn from(Select(selection): Select<SelT>) -> Self {
        Self::Get(selection.into(), PhantomData)
    }
}

impl<ArgT, SelT, ATy> From<ArgSelect<ArgT, SelT>> for CompositeSelectArgs<ArgT, SelT, ATy>
where
    ArgT: Serialize,
    SelT: Into<CompositeSelection>,
{
    fn from(ArgSelect(args, selection): ArgSelect<ArgT, SelT>) -> Self {
        Self::Get(
            NodeArgsErased::Inline(to_json_value(args)),
            selection.into(),
            PhantomData,
        )
    }
}

impl<ArgT, ATy> From<PlaceholderArg<ArgT>> for ScalarSelectArgs<ArgT, ATy> {
    fn from(value: PlaceholderArg<ArgT>) -> Self {
        Self::Get(NodeArgsErased::Placeholder(value.value), PhantomData)
    }
}
impl<ArgT, SelT, ATy> From<PlaceholderArgSelect<ArgT, SelT>>
    for CompositeSelectArgs<ArgT, SelT, ATy>
where
    SelT: Into<CompositeSelection>,
{
    fn from(value: PlaceholderArgSelect<ArgT, SelT>) -> Self {
        Self::Get(
            NodeArgsErased::Placeholder(value.value),
            value.selection.into(),
            PhantomData,
        )
    }
}

// --- ToAliasSelection impls --- //

/// This is a marker trait that allows the core selection types
/// like CompositeSelectNoArgs to mark which types can be used
/// as their aliasing nodes. This prevents usage of invalid selections
/// on aliases like [`Skip`].
pub trait FromAliasSelection<T> {}

impl FromAliasSelection<Get> for ScalarSelect<HasAlias> {}
impl<ArgT> FromAliasSelection<Args<ArgT>> for ScalarSelectArgs<ArgT, HasAlias> {}
impl<SelT> FromAliasSelection<Select<SelT>> for CompositeSelect<SelT, HasAlias> {}
impl<ArgT, SelT> FromAliasSelection<ArgSelect<ArgT, SelT>>
    for CompositeSelectArgs<ArgT, SelT, HasAlias>
{
}

// --- From Alias impls --- //

impl From<Alias<(), ScalarSelect<HasAlias>>> for ScalarSelect<HasAlias> {
    fn from(Alias(info): Alias<(), ScalarSelect<HasAlias>>) -> Self {
        Self::Alias(AliasInfo {
            aliases: info.aliases,
            _phantom: PhantomData,
        })
    }
}
impl<ArgT> From<Alias<ArgT, ()>> for ScalarSelectArgs<ArgT, HasAlias> {
    fn from(Alias(info): Alias<ArgT, ()>) -> Self {
        Self::Alias(info)
    }
}
impl<SelT> From<Alias<(), SelT>> for CompositeSelect<SelT, HasAlias> {
    fn from(Alias(info): Alias<(), SelT>) -> Self {
        Self::Alias(info)
    }
}
impl<ArgT, SelT> From<Alias<ArgT, SelT>> for CompositeSelectArgs<ArgT, SelT, HasAlias> {
    fn from(Alias(info): Alias<ArgT, SelT>) -> Self {
        Self::Alias(info)
    }
}

// --- Into SelectionErased impls --- //

impl<ArgT, SelT, ATy> From<AliasInfo<ArgT, SelT, ATy>> for SelectionErased {
    fn from(value: AliasInfo<ArgT, SelT, ATy>) -> SelectionErased {
        SelectionErased::Alias(value.aliases)
    }
}

impl<ATy> From<ScalarSelect<ATy>> for SelectionErased {
    fn from(value: ScalarSelect<ATy>) -> SelectionErased {
        use ScalarSelect::*;
        match value {
            Get => SelectionErased::Scalar,
            Skip => SelectionErased::None,
            Alias(alias) => alias.into(),
        }
    }
}

impl<ArgT, ATy> From<ScalarSelectArgs<ArgT, ATy>> for SelectionErased {
    fn from(value: ScalarSelectArgs<ArgT, ATy>) -> SelectionErased {
        use ScalarSelectArgs::*;
        match value {
            Get(arg, _) => SelectionErased::ScalarArgs(arg),
            Skip => SelectionErased::None,
            Alias(alias) => alias.into(),
        }
    }
}

impl<SelT, ATy> From<CompositeSelect<SelT, ATy>> for SelectionErased {
    fn from(value: CompositeSelect<SelT, ATy>) -> SelectionErased {
        use CompositeSelect::*;
        match value {
            Get(selection, _) => SelectionErased::Composite(selection),
            Skip => SelectionErased::None,
            Alias(alias) => alias.into(),
        }
    }
}

impl<ArgT, SelT, ATy> From<CompositeSelectArgs<ArgT, SelT, ATy>> for SelectionErased
where
    SelT: Into<SelectionErasedMap>,
{
    fn from(value: CompositeSelectArgs<ArgT, SelT, ATy>) -> SelectionErased {
        use CompositeSelectArgs::*;
        match value {
            Get(args, selection, _) => SelectionErased::CompositeArgs(args, selection),
            Skip => SelectionErased::None,
            Alias(alias) => alias.into(),
        }
    }
}

// --- UnionMember impls --- //

/// The following trait is used for types that implement
/// selections for the composite members of unions.
///
/// The err return value indicates the case where
/// aliases are used selections on members which is an error
///
/// This state is currently impossible to arrive at since
/// AliasInfo has no public construction methods with NoAlias
/// set. Union selection types make sure all their immediate
/// member selection use NoAlias to prevent this invalid stat.e
pub trait UnionMember {
    fn composite(self) -> Option<SelectionErasedMap>;
}

/// Internal marker trait use to make sure we can't have union members
/// selection being another union selection.
trait NotUnionSelection {}

// NOTE: UnionMembers are all NoAlias
impl UnionMember for ScalarSelect<NoAlias> {
    fn composite(self) -> Option<SelectionErasedMap> {
        None
    }
}

impl<ArgT> UnionMember for ScalarSelectArgs<ArgT, NoAlias> {
    fn composite(self) -> Option<SelectionErasedMap> {
        None
    }
}

impl<SelT> UnionMember for CompositeSelect<SelT, NoAlias>
where
    SelT: NotUnionSelection,
{
    fn composite(self) -> Option<SelectionErasedMap> {
        use CompositeSelect::*;
        match self {
            Get(CompositeSelection::Atomic(selection), _) => Some(selection),
            Skip => None,
            Get(CompositeSelection::Union(_), _) => {
                unreachable!("union selection on union member selection. how??")
            }
            Alias(_) => unreachable!("alias discovored on union/either member. how??"),
        }
    }
}

impl<ArgT, SelT, NoAlias> UnionMember for CompositeSelectArgs<ArgT, SelT, NoAlias>
where
    SelT: NotUnionSelection,
{
    fn composite(self) -> Option<SelectionErasedMap> {
        use CompositeSelectArgs::*;
        match self {
            Get(_args, CompositeSelection::Atomic(selection), _) => Some(selection),
            Skip => None,
            Get(_args, CompositeSelection::Union(_), _) => {
                unreachable!("union selection on union member selection. how??")
            }
            Alias(_) => unreachable!("alias discovored on union/either member. how??"),
        }
    }
}

// --- Into AliasSelection impls --- //

impl From<Get> for AliasSelection {
    fn from(_val: Get) -> Self {
        AliasSelection::Scalar
    }
}
impl<ArgT> From<Args<ArgT>> for AliasSelection
where
    ArgT: Serialize,
{
    fn from(val: Args<ArgT>) -> Self {
        AliasSelection::ScalarArgs(NodeArgsErased::Inline(to_json_value(val.0)))
    }
}
impl<SelT> From<Select<SelT>> for AliasSelection
where
    SelT: Into<CompositeSelection>,
{
    fn from(val: Select<SelT>) -> Self {
        let map = val.0.into();
        AliasSelection::Composite(map)
    }
}

impl<ArgT, SelT> From<ArgSelect<ArgT, SelT>> for AliasSelection
where
    ArgT: Serialize,
    SelT: Into<CompositeSelection>,
{
    fn from(val: ArgSelect<ArgT, SelT>) -> Self {
        let map = val.1.into();
        AliasSelection::CompositeArgs(NodeArgsErased::Inline(to_json_value(val.0)), map)
    }
}
impl<ATy> From<ScalarSelect<ATy>> for AliasSelection {
    fn from(val: ScalarSelect<ATy>) -> Self {
        use ScalarSelect::*;
        match val {
            Get => AliasSelection::Scalar,
            _ => unreachable!(),
        }
    }
}
impl<ArgT, ATy> From<ScalarSelectArgs<ArgT, ATy>> for AliasSelection {
    fn from(val: ScalarSelectArgs<ArgT, ATy>) -> Self {
        use ScalarSelectArgs::*;
        match val {
            Get(args, _) => AliasSelection::ScalarArgs(args),
            _ => unreachable!(),
        }
    }
}

impl<SelT, ATy> From<CompositeSelect<SelT, ATy>> for AliasSelection
where
    SelT: Into<SelectionErasedMap>,
{
    fn from(val: CompositeSelect<SelT, ATy>) -> Self {
        use CompositeSelect::*;
        match val {
            Get(select, _) => AliasSelection::Composite(select),
            _ => unreachable!(),
        }
    }
}
impl<ArgT, SelT, ATy> From<CompositeSelectArgs<ArgT, SelT, ATy>> for AliasSelection
where
    SelT: Into<SelectionErasedMap>,
{
    fn from(val: CompositeSelectArgs<ArgT, SelT, ATy>) -> Self {
        use CompositeSelectArgs::*;
        match val {
            Get(args, selection, _) => AliasSelection::CompositeArgs(args, selection),
            _ => unreachable!(),
        }
    }
}

// TODO: convert to proc_macro
#[macro_export]
macro_rules! impl_selection_traits {
    ($ty:ident,$($field:tt),+) => {
        impl<ATy> From<$ty<ATy>> for CompositeSelection {
            fn from(value: $ty<ATy>) -> CompositeSelection {
                CompositeSelection::Atomic(SelectionErasedMap(
                    [
                        $((stringify!($field).into(), value.$field.into()),)+
                    ]
                    .into(),
                ))
            }
        }

        impl<ATy> Selection for $ty<ATy> {
            fn all() -> Self {
                Self {
                    $($field: all(),)+
                }
            }
        }

        impl<ATy> NotUnionSelection for $ty<ATy> {}
    };
}
#[macro_export]
macro_rules! impl_union_selection_traits {
    ($ty:ident,$(($variant_ty:tt, $field:tt)),+) => {
        impl<ATy> From<$ty<ATy>> for CompositeSelection {
            fn from(_value: $ty<ATy>) -> CompositeSelection {
                /*CompositeSelection::Union(
                    [
                        $({
                            let selection =
                                UnionMember::composite(value.$field);
                            selection.map(|val| ($variant_ty.into(), val))
                        },)+
                    ]
                    .into_iter()
                    .filter_map(|val| val)
                    .collect(),
                )*/
                panic!("unions/either are wip")
            }
        }
    };
}

//
// --- --- Argument types --- --- //
//

pub enum NodeArgs<ArgT> {
    Inline(ArgT),
    Placeholder(PlaceholderValue),
}

impl<ArgT> From<ArgT> for NodeArgs<ArgT> {
    fn from(value: ArgT) -> Self {
        Self::Inline(value)
    }
}

#[derive(Debug)]
pub enum NodeArgsErased {
    None,
    Inline(serde_json::Value),
    Placeholder(PlaceholderValue),
}

impl<ArgT> From<NodeArgs<ArgT>> for NodeArgsErased
where
    ArgT: Serialize,
{
    fn from(value: NodeArgs<ArgT>) -> Self {
        match value {
            NodeArgs::Inline(arg) => Self::Inline(to_json_value(arg)),
            NodeArgs::Placeholder(ph) => Self::Placeholder(ph),
        }
    }
}

enum NodeArgsMerged {
    Inline(HashMap<CowStr, NodeArgValue>),
    Placeholder {
        value: PlaceholderValue,
        arg_types: HashMap<CowStr, CowStr>,
    },
}

/// This checks the input arg json for a node
/// against the arg description from the [`NodeMeta`].
fn check_node_args(
    args: serde_json::Value,
    arg_types: &HashMap<CowStr, CowStr>,
) -> Result<HashMap<CowStr, NodeArgValue>, String> {
    let args = match args {
        serde_json::Value::Object(val) => val,
        _ => unreachable!(),
    };
    let mut instance_args = HashMap::new();
    for (name, value) in args {
        let Some(type_name) = arg_types.get(&name[..]) else {
            return Err(name);
        };
        instance_args.insert(
            name.into(),
            NodeArgValue {
                type_name: type_name.clone(),
                value,
            },
        );
    }
    Ok(instance_args)
}

struct NodeArgValue {
    type_name: CowStr,
    value: serde_json::Value,
}

pub struct PreparedArgs;

impl PreparedArgs {
    pub fn get<ArgT, F, In>(&mut self, key: impl Into<CowStr>, fun: F) -> NodeArgs<ArgT>
    where
        In: serde::de::DeserializeOwned,
        F: Fn(In) -> ArgT + 'static + Send + Sync,
        ArgT: Serialize,
    {
        NodeArgs::Placeholder(PlaceholderValue {
            key: key.into(),
            fun: Box::new(move |value| {
                let value = serde_json::from_value(value)?;
                let value = fun(value);
                serde_json::to_value(value)
            }),
        })
    }
    pub fn arg<ArgT, T, F, In>(&mut self, key: impl Into<CowStr>, fun: F) -> T
    where
        T: From<PlaceholderArg<ArgT>>,
        In: serde::de::DeserializeOwned,
        F: Fn(In) -> ArgT + 'static + Send + Sync,
        ArgT: Serialize,
    {
        T::from(PlaceholderArg {
            value: PlaceholderValue {
                key: key.into(),
                fun: Box::new(move |value| {
                    let value = serde_json::from_value(value)?;
                    let value = fun(value);
                    serde_json::to_value(value)
                }),
            },
            _phantom: PhantomData,
        })
    }
    pub fn arg_select<ArgT, SelT, T, F, In>(
        &mut self,
        key: impl Into<CowStr>,
        selection: SelT,
        fun: F,
    ) -> T
    where
        T: From<PlaceholderArgSelect<ArgT, SelT>>,
        In: serde::de::DeserializeOwned,
        F: Fn(In) -> ArgT + 'static + Send + Sync,
        ArgT: Serialize,
    {
        T::from(PlaceholderArgSelect {
            value: PlaceholderValue {
                key: key.into(),
                fun: Box::new(move |value| {
                    let value = serde_json::from_value(value)?;
                    let value = fun(value);
                    serde_json::to_value(value)
                }),
            },
            selection,
            _phantom: PhantomData,
        })
    }
}

pub struct PlaceholderValue {
    key: CowStr,
    fun: Box<
        dyn Fn(serde_json::Value) -> Result<serde_json::Value, serde_json::Error> + Send + Sync,
    >,
}

impl std::fmt::Debug for PlaceholderValue {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PlaceholderValue")
            .field("key", &self.key)
            .finish_non_exhaustive()
    }
}

pub struct PlaceholderArg<ArgT> {
    value: PlaceholderValue,
    _phantom: PhantomData<ArgT>,
}
pub struct PlaceholderArgSelect<ArgT, SelT> {
    value: PlaceholderValue,
    selection: SelT,
    _phantom: PhantomData<ArgT>,
}

pub struct PlaceholderArgs<Arg>(Arg);

//
// --- --- GraphQL types --- --- //
//

use graphql::*;
pub mod graphql {
    use std::sync::Arc;

    use super::*;

    pub(super) type TyToGqlTyMap = Arc<HashMap<CowStr, CowStr>>;

    #[derive(Default, Clone)]
    pub struct GraphQlTransportOptions {
        headers: reqwest::header::HeaderMap,
        timeout: Option<std::time::Duration>,
    }

    // PlaceholderValue, fieldName -> gql_var_name
    type FoundPlaceholders = Vec<(PlaceholderValue, HashMap<CowStr, CowStr>)>;

    fn select_node_to_gql(
        ty_to_gql_ty_map: &TyToGqlTyMap,
        dest: &mut impl std::fmt::Write,
        node: SelectNodeErased,
        variable_types: &mut HashMap<CowStr, CowStr>,
        variables_object: &mut JsonObject,
        placeholders: &mut FoundPlaceholders,
    ) -> std::fmt::Result {
        if node.instance_name != node.node_name {
            write!(dest, "{}: {}", node.instance_name, node.node_name)?;
        } else {
            write!(dest, "{}", node.node_name)?;
        }
        if let Some(args) = node.args {
            match args {
                NodeArgsMerged::Inline(args) => {
                    if !args.is_empty() {
                        write!(dest, "(")?;
                        for (key, val) in args {
                            let name = format!("in{}", variable_types.len());
                            write!(dest, "{key}: ${name}, ")?;
                            variables_object.insert(name.clone(), val.value);
                            variable_types.insert(name.into(), val.type_name);
                        }
                        write!(dest, ")")?;
                    }
                }
                NodeArgsMerged::Placeholder { value, arg_types } => {
                    if !arg_types.is_empty() {
                        write!(dest, "(")?;
                        let mut map = HashMap::new();
                        for (key, type_name) in arg_types {
                            let name = format!("in{}", variable_types.len());
                            write!(dest, "{key}: ${name}, ")?;
                            variable_types.insert(name.clone().into(), type_name);
                            map.insert(key, name.into());
                        }
                        write!(dest, ")")?;
                        placeholders.push((value, map));
                    }
                }
            }
        }
        match node.sub_nodes {
            SubNodes::None => {}
            SubNodes::Atomic(sub_nodes) => {
                write!(dest, "{{ ")?;
                for node in sub_nodes {
                    select_node_to_gql(
                        ty_to_gql_ty_map,
                        dest,
                        node,
                        variable_types,
                        variables_object,
                        placeholders,
                    )?;
                    write!(dest, " ")?;
                }
                write!(dest, " }}")?;
            }
            SubNodes::Union(variants) => {
                write!(dest, "{{ ")?;
                for (ty, sub_nodes) in variants {
                    let gql_ty = ty_to_gql_ty_map
                        .get(&ty[..])
                        .expect("impossible: no GraphQL type equivalent found for variant type");
                    let gql_ty = match gql_ty.strip_suffix('!') {
                        Some(val) => val,
                        None => &gql_ty[..],
                    };
                    write!(dest, " ... on {gql_ty} {{ ")?;
                    for node in sub_nodes {
                        select_node_to_gql(
                            ty_to_gql_ty_map,
                            dest,
                            node,
                            variable_types,
                            variables_object,
                            placeholders,
                        )?;
                        write!(dest, " ")?;
                    }
                    write!(dest, " }}")?;
                }
                write!(dest, " }}")?;
            }
        }
        Ok(())
    }

    fn build_gql_doc(
        ty_to_gql_ty_map: &TyToGqlTyMap,
        nodes: Vec<SelectNodeErased>,
        ty: &'static str,
        name: Option<CowStr>,
    ) -> Result<(String, JsonObject, FoundPlaceholders), GraphQLRequestError> {
        use std::fmt::Write;
        let mut variables_types = HashMap::new();
        let mut variables_values = serde_json::Map::new();
        let mut root_nodes = String::new();
        let mut placeholders = vec![];
        for (idx, node) in nodes.into_iter().enumerate() {
            let node = SelectNodeErased {
                instance_name: format!("node{idx}").into(),
                ..node
            };
            write!(&mut root_nodes, "  ").expect("error building to string");
            select_node_to_gql(
                ty_to_gql_ty_map,
                &mut root_nodes,
                node,
                &mut variables_types,
                &mut variables_values,
                &mut placeholders,
            )
            .expect("error building to string");
            writeln!(&mut root_nodes).expect("error building to string");
        }
        let mut args_row = String::new();
        if !variables_types.is_empty() {
            write!(&mut args_row, "(").expect("error building to string");
            for (key, ty) in &variables_types {
                let gql_ty = ty_to_gql_ty_map.get(&ty[..]).ok_or_else(|| {
                    GraphQLRequestError::InvalidQuery {
                        error: Box::from(format!("unknown typegraph type found: {}", ty)),
                    }
                })?;
                write!(&mut args_row, "${key}: {gql_ty}, ").expect("error building to string");
            }
            write!(&mut args_row, ")").expect("error building to string");
        }
        let name = name.unwrap_or_else(|| "".into());
        let doc = format!("{ty} {name}{args_row} {{\n{root_nodes}}}");
        Ok((doc, variables_values, placeholders))
    }

    struct GraphQLRequest {
        addr: Url,
        method: reqwest::Method,
        headers: reqwest::header::HeaderMap,
        body: serde_json::Value,
    }

    fn build_gql_req(
        addr: Url,
        doc: &str,
        variables: &JsonObject,
        opts: &GraphQlTransportOptions,
    ) -> GraphQLRequest {
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(
            reqwest::header::ACCEPT,
            "application/json".try_into().unwrap(),
        );
        headers.insert(
            reqwest::header::CONTENT_TYPE,
            "application/json".try_into().unwrap(),
        );
        headers.extend(opts.headers.clone());
        // println!("{doc}, {variables:#?}");
        let body = serde_json::json!({
            "query": doc,
            "variables": variables
        });
        GraphQLRequest {
            addr,
            method: reqwest::Method::POST,
            headers,
            body,
        }
    }

    #[derive(Debug)]
    pub struct GraphQLResponse {
        pub status: reqwest::StatusCode,
        pub headers: reqwest::header::HeaderMap,
        pub body: JsonObject,
    }

    fn handle_response(
        response: GraphQLResponse,
        nodes_len: usize,
    ) -> Result<Vec<serde_json::Value>, GraphQLRequestError> {
        if !response.status.is_success() {
            return Err(GraphQLRequestError::RequestFailed { response });
        }
        #[derive(Debug, Deserialize)]
        struct Response {
            data: Option<JsonObject>,
            errors: Option<Vec<GraphqlError>>,
        }
        let body: Response = match serde_json::from_value(serde_json::Value::Object(response.body))
        {
            Ok(body) => body,
            Err(error) => {
                return Err(GraphQLRequestError::BodyError {
                    error: Box::new(error),
                })
            }
        };
        if let Some(errors) = body.errors {
            return Err(GraphQLRequestError::RequestErrors {
                errors,
                data: body.data,
            });
        }
        let Some(mut body) = body.data else {
            return Err(GraphQLRequestError::BodyError {
                error: Box::from("body response doesn't contain data field"),
            });
        };
        (0..nodes_len)
            .map(|idx| {
                body.remove(&format!("node{idx}"))
                    .ok_or_else(|| GraphQLRequestError::BodyError {
                        error: Box::from(format!(
                            "expecting response under node key 'node{idx}' but none found"
                        )),
                    })
            })
            .collect::<Result<Vec<_>, _>>()
    }

    #[derive(Debug)]
    pub enum GraphQLRequestError {
        /// GraphQL errors recieived
        RequestErrors {
            errors: Vec<GraphqlError>,
            data: Option<JsonObject>,
        },
        /// Http error codes recieived
        RequestFailed {
            response: GraphQLResponse,
        },
        /// Unable to deserialize body
        BodyError {
            error: BoxErr,
        },
        /// Unable to make http request
        NetworkError {
            error: BoxErr,
        },
        InvalidQuery {
            error: BoxErr,
        },
    }

    impl std::fmt::Display for GraphQLRequestError {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            match self {
                GraphQLRequestError::RequestErrors { errors, .. } => {
                    write!(f, "graphql errors in response: ")?;
                    for err in errors {
                        write!(f, "{}, ", err.message)?;
                    }
                }
                GraphQLRequestError::RequestFailed { response } => {
                    write!(f, "request failed with status {}", response.status)?;
                }
                GraphQLRequestError::BodyError { error } => {
                    write!(f, "error reading request body: {error}")?;
                }
                GraphQLRequestError::NetworkError { error } => {
                    write!(f, "error making http request: {error}")?;
                }
                GraphQLRequestError::InvalidQuery { error } => {
                    write!(f, "error building request: {error}")?
                }
            }
            Ok(())
        }
    }
    impl std::error::Error for GraphQLRequestError {}

    #[derive(Debug, Deserialize)]
    pub struct ErrorLocation {
        pub line: u32,
        pub column: u32,
    }
    #[derive(Debug, Deserialize)]
    pub struct GraphqlError {
        pub message: String,
        pub locations: Option<Vec<ErrorLocation>>,
        pub path: Option<Vec<PathSegment>>,
    }

    #[derive(Debug)]
    pub enum PathSegment {
        Field(String),
        Index(u64),
    }

    impl<'de> serde::de::Deserialize<'de> for PathSegment {
        fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
        where
            D: serde::Deserializer<'de>,
        {
            use serde_json::Value;
            let val = Value::deserialize(deserializer)?;
            match val {
                Value::Number(n) => Ok(PathSegment::Index(n.as_u64().unwrap())),
                Value::String(s) => Ok(PathSegment::Field(s)),
                _ => panic!("invalid path segment type"),
            }
        }
    }

    #[derive(Clone)]
    pub struct GraphQlTransportReqwestSync {
        addr: Url,
        ty_to_gql_ty_map: TyToGqlTyMap,
        client: reqwest::blocking::Client,
    }

    #[derive(Clone)]
    pub struct GraphQlTransportReqwest {
        addr: Url,
        ty_to_gql_ty_map: TyToGqlTyMap,
        client: reqwest::Client,
    }

    impl GraphQlTransportReqwestSync {
        pub fn new(addr: Url, ty_to_gql_ty_map: TyToGqlTyMap) -> Self {
            Self {
                addr,
                ty_to_gql_ty_map,
                client: reqwest::blocking::Client::new(),
            }
        }

        fn fetch(
            &self,
            nodes: Vec<SelectNodeErased>,
            opts: &GraphQlTransportOptions,
            ty: &'static str,
        ) -> Result<Vec<serde_json::Value>, GraphQLRequestError> {
            let nodes_len = nodes.len();
            let (doc, variables, placeholders) =
                build_gql_doc(&self.ty_to_gql_ty_map, nodes, ty, None)?;
            if !placeholders.is_empty() {
                panic!("placeholders found in non-prepared query")
            }
            let req = build_gql_req(self.addr.clone(), &doc, &variables, opts);
            let req = self
                .client
                .request(req.method, req.addr)
                .headers(req.headers)
                .json(&req.body);
            let req = if let Some(timeout) = opts.timeout {
                req.timeout(timeout)
            } else {
                req
            };
            match req.send() {
                Ok(res) => {
                    let status = res.status();
                    let headers = res.headers().clone();
                    match res.json::<JsonObject>() {
                        Ok(body) => handle_response(
                            GraphQLResponse {
                                status,
                                headers,
                                body,
                            },
                            nodes_len,
                        ),
                        Err(error) => Err(GraphQLRequestError::BodyError {
                            error: Box::new(error),
                        }),
                    }
                }
                Err(error) => Err(GraphQLRequestError::NetworkError {
                    error: Box::new(error),
                }),
            }
        }

        pub fn query<Doc: ToSelectDoc + ToQueryDoc>(
            &self,
            nodes: Doc,
        ) -> Result<Doc::Out, GraphQLRequestError> {
            self.query_with_opts(nodes, &Default::default())
        }

        pub fn query_with_opts<Doc: ToSelectDoc + ToQueryDoc>(
            &self,
            nodes: Doc,
            opts: &GraphQlTransportOptions,
        ) -> Result<Doc::Out, GraphQLRequestError> {
            let resp = self.fetch(nodes.to_select_doc(), opts, "query")?;
            let resp = Doc::parse_response(resp).map_err(|err| GraphQLRequestError::BodyError {
                error: Box::from(format!(
                    "error deserializing response into output type: {err}"
                )),
            })?;
            Ok(resp)
        }

        pub fn mutation<Doc: ToSelectDoc + ToMutationDoc>(
            &self,
            nodes: Doc,
        ) -> Result<Doc::Out, GraphQLRequestError> {
            self.mutation_with_opts(nodes, &Default::default())
        }

        pub fn mutation_with_opts<Doc: ToSelectDoc + ToMutationDoc>(
            &self,
            nodes: Doc,
            opts: &GraphQlTransportOptions,
        ) -> Result<Doc::Out, GraphQLRequestError> {
            let resp = self.fetch(nodes.to_select_doc(), opts, "mutation")?;
            let resp = Doc::parse_response(resp).map_err(|err| GraphQLRequestError::BodyError {
                error: Box::from(format!(
                    "error deserializing response into output type: {err}"
                )),
            })?;
            Ok(resp)
        }
        pub fn prepare_query<Doc: ToSelectDoc + ToQueryDoc>(
            &self,
            fun: impl FnOnce(&mut PreparedArgs) -> Result<Doc, BoxErr>,
        ) -> Result<PreparedRequestReqwestSync<Doc>, PrepareRequestError> {
            self.prepare_query_with_opts(fun, Default::default())
        }

        pub fn prepare_query_with_opts<Doc: ToSelectDoc + ToQueryDoc>(
            &self,
            fun: impl FnOnce(&mut PreparedArgs) -> Result<Doc, BoxErr>,
            opts: GraphQlTransportOptions,
        ) -> Result<PreparedRequestReqwestSync<Doc>, PrepareRequestError> {
            PreparedRequestReqwestSync::new(
                fun,
                self.addr.clone(),
                opts,
                "query",
                &self.ty_to_gql_ty_map,
            )
        }

        pub fn prepare_mutation<Doc: ToSelectDoc + ToMutationDoc>(
            &self,
            fun: impl FnOnce(&mut PreparedArgs) -> Result<Doc, BoxErr>,
        ) -> Result<PreparedRequestReqwestSync<Doc>, PrepareRequestError> {
            self.prepare_mutation_with_opts(fun, Default::default())
        }

        pub fn prepare_mutation_with_opts<Doc: ToSelectDoc + ToMutationDoc>(
            &self,
            fun: impl FnOnce(&mut PreparedArgs) -> Result<Doc, BoxErr>,
            opts: GraphQlTransportOptions,
        ) -> Result<PreparedRequestReqwestSync<Doc>, PrepareRequestError> {
            PreparedRequestReqwestSync::new(
                fun,
                self.addr.clone(),
                opts,
                "mutation",
                &self.ty_to_gql_ty_map,
            )
        }
    }

    impl GraphQlTransportReqwest {
        pub fn new(addr: Url, ty_to_gql_ty_map: TyToGqlTyMap) -> Self {
            Self {
                addr,
                ty_to_gql_ty_map,
                client: reqwest::Client::new(),
            }
        }

        async fn fetch(
            &self,
            nodes: Vec<SelectNodeErased>,
            opts: &GraphQlTransportOptions,
            ty: &'static str,
        ) -> Result<Vec<serde_json::Value>, GraphQLRequestError> {
            let nodes_len = nodes.len();
            let (doc, variables, placeholders) =
                build_gql_doc(&self.ty_to_gql_ty_map, nodes, ty, None)?;
            if !placeholders.is_empty() {
                panic!("placeholders found in non-prepared query")
            }
            let req = build_gql_req(self.addr.clone(), &doc, &variables, opts);
            let req = self
                .client
                .request(req.method, req.addr)
                .headers(req.headers)
                .json(&req.body);
            let req = if let Some(timeout) = opts.timeout {
                req.timeout(timeout)
            } else {
                req
            };
            match req.send().await {
                Ok(res) => {
                    let status = res.status();
                    let headers = res.headers().clone();
                    match res.json::<JsonObject>().await {
                        Ok(body) => handle_response(
                            GraphQLResponse {
                                status,
                                headers,
                                body,
                            },
                            nodes_len,
                        ),
                        Err(error) => Err(GraphQLRequestError::BodyError {
                            error: Box::new(error),
                        }),
                    }
                }
                Err(error) => Err(GraphQLRequestError::NetworkError {
                    error: Box::new(error),
                }),
            }
        }

        pub async fn query<Doc: ToSelectDoc + ToQueryDoc>(
            &self,
            nodes: Doc,
        ) -> Result<Doc::Out, GraphQLRequestError> {
            self.query_with_opts(nodes, &Default::default()).await
        }

        pub async fn query_with_opts<Doc: ToSelectDoc + ToQueryDoc>(
            &self,
            nodes: Doc,
            opts: &GraphQlTransportOptions,
        ) -> Result<Doc::Out, GraphQLRequestError> {
            let resp = self.fetch(nodes.to_select_doc(), opts, "query").await?;
            let resp = Doc::parse_response(resp).map_err(|err| GraphQLRequestError::BodyError {
                error: Box::from(format!(
                    "error deserializing response into output type: {err}"
                )),
            })?;
            Ok(resp)
        }

        pub async fn mutation<Doc: ToSelectDoc + ToMutationDoc>(
            &self,
            nodes: Doc,
        ) -> Result<Doc::Out, GraphQLRequestError> {
            self.mutation_with_opts(nodes, &Default::default()).await
        }

        pub async fn mutation_with_opts<Doc: ToSelectDoc + ToMutationDoc>(
            &self,
            nodes: Doc,
            opts: &GraphQlTransportOptions,
        ) -> Result<Doc::Out, GraphQLRequestError> {
            let resp = self.fetch(nodes.to_select_doc(), opts, "mutation").await?;
            let resp = Doc::parse_response(resp).map_err(|err| GraphQLRequestError::BodyError {
                error: Box::from(format!(
                    "error deserializing response into output type: {err}"
                )),
            })?;
            Ok(resp)
        }
        pub fn prepare_query<Doc: ToSelectDoc + ToQueryDoc>(
            &self,
            fun: impl FnOnce(&mut PreparedArgs) -> Result<Doc, BoxErr>,
        ) -> Result<PreparedRequestReqwest<Doc>, PrepareRequestError> {
            self.prepare_query_with_opts(fun, Default::default())
        }

        pub fn prepare_query_with_opts<Doc: ToSelectDoc + ToQueryDoc>(
            &self,
            fun: impl FnOnce(&mut PreparedArgs) -> Result<Doc, BoxErr>,
            opts: GraphQlTransportOptions,
        ) -> Result<PreparedRequestReqwest<Doc>, PrepareRequestError> {
            PreparedRequestReqwest::new(
                fun,
                self.addr.clone(),
                opts,
                "query",
                &self.ty_to_gql_ty_map,
            )
        }

        pub fn prepare_mutation<Doc: ToSelectDoc + ToMutationDoc>(
            &self,
            fun: impl FnOnce(&mut PreparedArgs) -> Result<Doc, BoxErr>,
        ) -> Result<PreparedRequestReqwest<Doc>, PrepareRequestError> {
            self.prepare_mutation_with_opts(fun, Default::default())
        }

        pub fn prepare_mutation_with_opts<Doc: ToSelectDoc + ToMutationDoc>(
            &self,
            fun: impl FnOnce(&mut PreparedArgs) -> Result<Doc, BoxErr>,
            opts: GraphQlTransportOptions,
        ) -> Result<PreparedRequestReqwest<Doc>, PrepareRequestError> {
            PreparedRequestReqwest::new(
                fun,
                self.addr.clone(),
                opts,
                "mutation",
                &self.ty_to_gql_ty_map,
            )
        }
    }

    fn resolve_prepared_variables(
        placeholders: &FoundPlaceholders,
        mut inline_variables: JsonObject,
        mut args: HashMap<CowStr, serde_json::Value>,
    ) -> Result<JsonObject, PrepareRequestError> {
        for (ph, key_map) in placeholders {
            let Some(value) = args.remove(&ph.key) else {
                return Err(PrepareRequestError::PlaceholderError(Box::from(format!(
                    "no value found for placeholder expected under key '{}'",
                    ph.key
                ))));
            };
            let value = (ph.fun)(value).map_err(|err| {
                PrepareRequestError::PlaceholderError(Box::from(format!(
                    "error applying placeholder closure for value under key '{}': {err}",
                    ph.key
                )))
            })?;
            let serde_json::Value::Object(mut value) = value else {
                unreachable!("placeholder closures must return structs");
            };
            for (key, var_key) in key_map {
                inline_variables.insert(
                    var_key.clone().into(),
                    value.remove(&key[..]).unwrap_or(serde_json::Value::Null),
                );
            }
        }
        Ok(inline_variables)
    }

    pub struct PreparedRequestReqwest<Out> {
        addr: Url,
        client: reqwest::Client,
        nodes_len: usize,
        doc: String,
        variables: JsonObject,
        opts: GraphQlTransportOptions,
        placeholders: Arc<FoundPlaceholders>,
        _phantom: PhantomData<Out>,
    }

    pub struct PreparedRequestReqwestSync<Doc> {
        addr: Url,
        client: reqwest::blocking::Client,
        nodes_len: usize,
        doc: String,
        variables: JsonObject,
        opts: GraphQlTransportOptions,
        placeholders: Arc<FoundPlaceholders>,
        _phantom: PhantomData<Doc>,
    }

    impl<Doc: ToSelectDoc> PreparedRequestReqwestSync<Doc> {
        fn new(
            fun: impl FnOnce(&mut PreparedArgs) -> Result<Doc, BoxErr>,
            addr: Url,
            opts: GraphQlTransportOptions,
            ty: &'static str,
            ty_to_gql_ty_map: &TyToGqlTyMap,
        ) -> Result<Self, PrepareRequestError> {
            let nodes = fun(&mut PreparedArgs).map_err(PrepareRequestError::FunctionError)?;
            let nodes = nodes.to_select_doc();
            let nodes_len = nodes.len();
            let (doc, variables, placeholders) = build_gql_doc(ty_to_gql_ty_map, nodes, ty, None)
                .map_err(PrepareRequestError::BuildError)?;
            Ok(Self {
                doc,
                variables,
                nodes_len,
                addr,
                client: reqwest::blocking::Client::new(),
                opts,
                placeholders: Arc::new(placeholders),
                _phantom: PhantomData,
            })
        }

        pub fn perform<K, V>(
            &self,
            args: impl Into<HashMap<K, V>>,
        ) -> Result<Doc::Out, PrepareRequestError>
        where
            K: Into<CowStr>,
            V: serde::Serialize,
        {
            let args: HashMap<K, V> = args.into();
            let args = args
                .into_iter()
                .map(|(key, val)| (key.into(), to_json_value(val)))
                .collect();
            let variables =
                resolve_prepared_variables(&self.placeholders, self.variables.clone(), args)?;
            let req = build_gql_req(self.addr.clone(), &self.doc, &variables, &self.opts);
            let req = self
                .client
                .request(req.method, req.addr)
                .headers(req.headers)
                .json(&req.body);
            let req = if let Some(timeout) = self.opts.timeout {
                req.timeout(timeout)
            } else {
                req
            };
            let res = match req.send() {
                Ok(res) => {
                    let status = res.status();
                    let headers = res.headers().clone();
                    match res.json::<JsonObject>() {
                        Ok(body) => handle_response(
                            GraphQLResponse {
                                status,
                                headers,
                                body,
                            },
                            self.nodes_len,
                        )
                        .map_err(PrepareRequestError::RequestError)?,
                        Err(error) => {
                            return Err(PrepareRequestError::RequestError(
                                GraphQLRequestError::BodyError {
                                    error: Box::new(error),
                                },
                            ))
                        }
                    }
                }
                Err(error) => {
                    return Err(PrepareRequestError::RequestError(
                        GraphQLRequestError::NetworkError {
                            error: Box::new(error),
                        },
                    ))
                }
            };
            Doc::parse_response(res).map_err(|err| {
                PrepareRequestError::RequestError(GraphQLRequestError::BodyError {
                    error: Box::from(format!(
                        "error deserializing response into output type: {err}"
                    )),
                })
            })
        }
    }

    impl<Doc: ToSelectDoc> PreparedRequestReqwest<Doc> {
        fn new(
            fun: impl FnOnce(&mut PreparedArgs) -> Result<Doc, BoxErr>,
            addr: Url,
            opts: GraphQlTransportOptions,
            ty: &'static str,
            ty_to_gql_ty_map: &TyToGqlTyMap,
        ) -> Result<Self, PrepareRequestError> {
            let nodes = fun(&mut PreparedArgs).map_err(PrepareRequestError::FunctionError)?;
            let nodes = nodes.to_select_doc();
            let nodes_len = nodes.len();
            let (doc, variables, placeholders) = build_gql_doc(ty_to_gql_ty_map, nodes, ty, None)
                .map_err(PrepareRequestError::BuildError)?;
            let placeholders = std::sync::Arc::new(placeholders);
            Ok(Self {
                doc,
                variables,
                nodes_len,
                addr,
                client: reqwest::Client::new(),
                opts,
                placeholders,
                _phantom: PhantomData,
            })
        }

        pub async fn perform<K, V>(
            &self,
            args: impl Into<HashMap<K, V>>,
        ) -> Result<Doc::Out, PrepareRequestError>
        where
            K: Into<CowStr>,
            V: serde::Serialize,
        {
            let args: HashMap<K, V> = args.into();
            let args = args
                .into_iter()
                .map(|(key, val)| (key.into(), to_json_value(val)))
                .collect();
            let variables =
                resolve_prepared_variables(&self.placeholders, self.variables.clone(), args)?;
            let req = build_gql_req(self.addr.clone(), &self.doc, &variables, &self.opts);
            let req = self
                .client
                .request(req.method, req.addr)
                .headers(req.headers)
                .json(&req.body);
            let req = if let Some(timeout) = self.opts.timeout {
                req.timeout(timeout)
            } else {
                req
            };
            let res = match req.send().await {
                Ok(res) => {
                    let status = res.status();
                    let headers = res.headers().clone();
                    match res.json::<JsonObject>().await {
                        Ok(body) => handle_response(
                            GraphQLResponse {
                                status,
                                headers,
                                body,
                            },
                            self.nodes_len,
                        )
                        .map_err(PrepareRequestError::RequestError)?,
                        Err(error) => {
                            return Err(PrepareRequestError::RequestError(
                                GraphQLRequestError::BodyError {
                                    error: Box::new(error),
                                },
                            ))
                        }
                    }
                }
                Err(error) => {
                    return Err(PrepareRequestError::RequestError(
                        GraphQLRequestError::NetworkError {
                            error: Box::new(error),
                        },
                    ))
                }
            };
            Doc::parse_response(res).map_err(|err| {
                PrepareRequestError::RequestError(GraphQLRequestError::BodyError {
                    error: Box::from(format!(
                        "error deserializing response into output type: {err}"
                    )),
                })
            })
        }
    }

    // we need a manual clone impl since the derive will
    // choke if Doc isn't clone
    impl<Doc> Clone for PreparedRequestReqwestSync<Doc> {
        fn clone(&self) -> Self {
            Self {
                addr: self.addr.clone(),
                client: self.client.clone(),
                nodes_len: self.nodes_len,
                doc: self.doc.clone(),
                variables: self.variables.clone(),
                opts: self.opts.clone(),
                placeholders: self.placeholders.clone(),
                _phantom: PhantomData,
            }
        }
    }
    impl<Doc> Clone for PreparedRequestReqwest<Doc> {
        fn clone(&self) -> Self {
            Self {
                addr: self.addr.clone(),
                client: self.client.clone(),
                nodes_len: self.nodes_len,
                doc: self.doc.clone(),
                variables: self.variables.clone(),
                opts: self.opts.clone(),
                placeholders: self.placeholders.clone(),
                _phantom: PhantomData,
            }
        }
    }

    #[derive(Debug)]
    pub enum PrepareRequestError {
        FunctionError(BoxErr),
        BuildError(GraphQLRequestError),
        PlaceholderError(BoxErr),
        RequestError(GraphQLRequestError),
    }

    impl std::error::Error for PrepareRequestError {}
    impl std::fmt::Display for PrepareRequestError {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            match self {
                PrepareRequestError::FunctionError(err) => {
                    write!(f, "error calling doc builder closure: {err}")
                }
                PrepareRequestError::BuildError(err) => write!(f, "error building request: {err}"),
                PrepareRequestError::PlaceholderError(err) => {
                    write!(f, "error resolving placeholder values: {err}")
                }
                PrepareRequestError::RequestError(err) => {
                    write!(f, "error making graphql request: {err}")
                }
            }
        }
    }
}

//
// --- --- QueryGraph types --- --- //
//

#[derive(Clone)]
pub struct QueryGraph {
    ty_to_gql_ty_map: TyToGqlTyMap,
    addr: Url,
}

impl QueryGraph {
    pub fn graphql(&self) -> GraphQlTransportReqwest {
        GraphQlTransportReqwest::new(self.addr.clone(), self.ty_to_gql_ty_map.clone())
    }
    pub fn graphql_sync(&self) -> GraphQlTransportReqwestSync {
        GraphQlTransportReqwestSync::new(self.addr.clone(), self.ty_to_gql_ty_map.clone())
    }
}

//
// --- --- Typegraph types --- --- //
//