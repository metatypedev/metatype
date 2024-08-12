// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{collections::HashMap, marker::PhantomData};

use reqwest::Url;
use serde::{Deserialize, Serialize};

type CowStr = std::borrow::Cow<'static, str>;
type JsonObject = serde_json::Map<String, serde_json::Value>;

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
            SelectionErased::Scalar => vec![(node_name.clone(), (None, None))],
            SelectionErased::ScalarArgs(args) => vec![(node_name.clone(), (Some(args), None))],
            SelectionErased::Composite(select) => {
                vec![(node_name.clone(), (None, Some(select)))]
            }
            SelectionErased::CompositeArgs(args, select) => {
                vec![(node_name.clone(), (Some(args), Some(select)))]
            }
            SelectionErased::Alias(aliases) => aliases
                .into_iter()
                .map(|(instance_name, selection)| {
                    (
                        instance_name,
                        match selection {
                            AliasSelection::Scalar => (None, None),
                            AliasSelection::ScalarArgs(args) => (Some(args), None),
                            AliasSelection::Composite(select) => (None, Some(select)),
                            AliasSelection::CompositeArgs(args, select) => {
                                (Some(args), Some(select))
                            }
                        },
                    )
                })
                .collect(),
        };

        let meta = meta_fn();
        for (instance_name, (args, select)) in node_instances {
            let args = if let Some(arg_types) = &meta.arg_types {
                let Some(args) = args else {
                    return Err(SelectionError::MissingArgs {
                        path: format!("{parent_path}.{instance_name}"),
                    });
                };
                let args = match args {
                    serde_json::Value::Object(val) => val,
                    _ => unreachable!(),
                };
                let mut instance_args = HashMap::new();
                for (name, value) in args {
                    let Some(type_name) = arg_types.get(&name[..]) else {
                        return Err(SelectionError::UnexpectedArgs {
                            name,
                            path: format!("{parent_path}.{instance_name}"),
                        });
                    };
                    instance_args.insert(
                        name.into(),
                        NodeArgValue {
                            type_name: type_name.clone(),
                            value,
                        },
                    );
                }
                Some(instance_args)
            } else {
                None
            };

            let sub_nodes = if let Some(sub_nodes) = &meta.sub_nodes {
                let Some(select) = select else {
                    return Err(SelectionError::MissingSubNodes {
                        path: format!("{parent_path}.{instance_name}"),
                    });
                };
                selection_to_node_set(select, sub_nodes, format!("{parent_path}.{instance_name}"))?
            } else {
                vec![]
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
    UnexpectedArgs { path: String, name: String },
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
}

/// The final form of the nodes used in queries.
pub struct SelectNodeErased {
    node_name: CowStr,
    instance_name: CowStr,
    args: Option<NodeArgs>,
    sub_nodes: Vec<SelectNodeErased>,
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
    args: Option<serde_json::Value>,
    _marker: PhantomData<(SelT, SelAliasedT, QTy, Out)>,
}

impl<SelT, SelAliased, QTy, Out> UnselectedNode<SelT, SelAliased, QTy, Out>
where
    SelT: Into<SelectionErasedMap>,
{
    fn select_erased(self, select: SelT) -> Result<SelectNodeErased, SelectionError> {
        let nodes = selection_to_node_set(
            SelectionErasedMap(
                [(
                    self.root_name.clone(),
                    match self.args {
                        Some(args) => SelectionErased::CompositeArgs(args, select.into()),
                        None => SelectionErased::Composite(select.into()),
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
    SelAliased: Into<SelectionErasedMap>,
{
    fn select_aliased_erased(self, select: SelAliased) -> Result<SelectNodeErased, SelectionError> {
        let nodes = selection_to_node_set(
            SelectionErasedMap(
                [(
                    self.root_name.clone(),
                    match self.args {
                        Some(args) => SelectionErased::CompositeArgs(args, select.into()),
                        None => SelectionErased::Composite(select.into()),
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
    SelT: Into<SelectionErasedMap>,
{
    pub fn select(self, select: SelT) -> Result<QueryNode<Out>, SelectionError> {
        Ok(QueryNode(self.select_erased(select)?, PhantomData))
    }
}
impl<SelT, SelAliased, Out> UnselectedNode<SelT, SelAliased, QueryMarker, Out>
where
    SelAliased: Into<SelectionErasedMap>,
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
    SelT: Into<SelectionErasedMap>,
{
    pub fn select(self, select: SelT) -> Result<MutationNode<Out>, SelectionError> {
        Ok(MutationNode(self.select_erased(select)?, PhantomData))
    }
}
impl<SelT, SelAliased, Out> UnselectedNode<SelT, SelAliased, MutationMarker, Out>
where
    SelAliased: Into<SelectionErasedMap>,
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
enum SelectionErased {
    None,
    Scalar,
    ScalarArgs(serde_json::Value),
    Composite(SelectionErasedMap),
    CompositeArgs(serde_json::Value, SelectionErasedMap),
    Alias(HashMap<CowStr, AliasSelection>),
}

#[derive(Debug)]
pub enum AliasSelection {
    Scalar,
    ScalarArgs(serde_json::Value),
    Composite(SelectionErasedMap),
    CompositeArgs(serde_json::Value, SelectionErasedMap),
}

#[derive(Default, Clone, Copy)]
pub struct HasAlias;
#[derive(Default, Clone, Copy)]
pub struct NoAlias;

#[derive(Debug)]
pub struct AliasInfo<ArgT, SelT, ATyag> {
    aliases: HashMap<CowStr, AliasSelection>,
    _phantom: PhantomData<(ArgT, SelT, ATyag)>,
}

#[derive(Debug)]
pub enum ScalarSelectNoArgs<ATy> {
    Get,
    Skip,
    Alias(AliasInfo<(), (), ATy>),
}
#[derive(Debug)]
pub enum ScalarSelectArgs<ArgT, ATy> {
    Get(serde_json::Value, PhantomData<ArgT>),
    Skip,
    Alias(AliasInfo<ArgT, (), ATy>),
}
#[derive(Debug)]
pub enum CompositeSelectNoArgs<SelT, ATy> {
    Get(SelectionErasedMap, PhantomData<SelT>),
    Skip,
    Alias(AliasInfo<(), SelT, ATy>),
}
#[derive(Debug)]
pub enum CompositeSelectArgs<ArgT, SelT, ATy> {
    Get(
        serde_json::Value,
        SelectionErasedMap,
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
pub fn arg_select<Arg, SelT, T: From<ArgSelect<Arg, SelT>>>(args: Arg, selection: SelT) -> T {
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

impl<ATy> Selection for ScalarSelectNoArgs<ATy> {
    fn all() -> Self {
        Self::Get
    }
}
impl<ArgT, ATy> Selection for ScalarSelectArgs<ArgT, ATy> {
    fn all() -> Self {
        Self::Skip
    }
}
impl<SelT, ATy> Selection for CompositeSelectNoArgs<SelT, ATy>
where
    SelT: Selection + Into<SelectionErasedMap>,
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

impl<ATy> Default for ScalarSelectNoArgs<ATy> {
    fn default() -> Self {
        Self::Skip
    }
}
impl<ArgT, ATy> Default for ScalarSelectArgs<ArgT, ATy> {
    fn default() -> Self {
        Self::Skip
    }
}
impl<SelT, ATy> Default for CompositeSelectNoArgs<SelT, ATy> {
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

impl<ATy> From<Get> for ScalarSelectNoArgs<ATy> {
    fn from(_: Get) -> Self {
        Self::Get
    }
}

impl<ATy> From<Skip> for ScalarSelectNoArgs<ATy> {
    fn from(_: Skip) -> Self {
        Self::Skip
    }
}
impl<ArgT, ATy> From<Skip> for ScalarSelectArgs<ArgT, ATy> {
    fn from(_: Skip) -> Self {
        Self::Skip
    }
}
impl<SelT, ATy> From<Skip> for CompositeSelectNoArgs<SelT, ATy> {
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
        Self::Get(to_json_value(args), PhantomData)
    }
}

impl<SelT, ATy> From<Select<SelT>> for CompositeSelectNoArgs<SelT, ATy>
where
    SelT: Into<SelectionErasedMap>,
{
    fn from(Select(selection): Select<SelT>) -> Self {
        Self::Get(selection.into(), PhantomData)
    }
}

impl<ArgT, SelT, ATy> From<ArgSelect<ArgT, SelT>> for CompositeSelectArgs<ArgT, SelT, ATy>
where
    ArgT: Serialize,
    SelT: Into<SelectionErasedMap>,
{
    fn from(ArgSelect(args, selection): ArgSelect<ArgT, SelT>) -> Self {
        Self::Get(to_json_value(args), selection.into(), PhantomData)
    }
}

// --- ToAliasSelection impls --- //

/// This is a marker trait that allows the core selection types
/// like CompositeSelectNoArgs to mark which types can be used
/// as their aliasing nodes. This prevents usage of invalid selections
/// on aliases like [`Skip`].
pub trait FromAliasSelection<T> {}

impl FromAliasSelection<Get> for ScalarSelectNoArgs<HasAlias> {}
impl<ArgT> FromAliasSelection<Args<ArgT>> for ScalarSelectArgs<ArgT, HasAlias> {}
impl<SelT> FromAliasSelection<Select<SelT>> for CompositeSelectNoArgs<SelT, HasAlias> {}
impl<ArgT, SelT> FromAliasSelection<ArgSelect<ArgT, SelT>>
    for CompositeSelectArgs<ArgT, SelT, HasAlias>
{
}

// --- From Alias impls --- //

impl From<Alias<(), ScalarSelectNoArgs<HasAlias>>> for ScalarSelectNoArgs<HasAlias> {
    fn from(Alias(info): Alias<(), ScalarSelectNoArgs<HasAlias>>) -> Self {
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
impl<SelT> From<Alias<(), SelT>> for CompositeSelectNoArgs<SelT, HasAlias> {
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

impl<ATy> From<ScalarSelectNoArgs<ATy>> for SelectionErased {
    fn from(value: ScalarSelectNoArgs<ATy>) -> SelectionErased {
        use ScalarSelectNoArgs::*;
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

impl<SelT, ATy> From<CompositeSelectNoArgs<SelT, ATy>> for SelectionErased
where
    SelT: Into<SelectionErasedMap>,
{
    fn from(value: CompositeSelectNoArgs<SelT, ATy>) -> SelectionErased {
        use CompositeSelectNoArgs::*;
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
        AliasSelection::ScalarArgs(to_json_value(val.0))
    }
}
impl<SelT> From<Select<SelT>> for AliasSelection
where
    SelT: Into<SelectionErasedMap>,
{
    fn from(val: Select<SelT>) -> Self {
        let map = val.0.into();
        AliasSelection::Composite(map)
    }
}

impl<ArgT, SelT> From<ArgSelect<ArgT, SelT>> for AliasSelection
where
    ArgT: Serialize,
    SelT: Into<SelectionErasedMap>,
{
    fn from(val: ArgSelect<ArgT, SelT>) -> Self {
        let map = val.1.into();
        AliasSelection::CompositeArgs(to_json_value(val.0), map)
    }
}
impl<ATy> From<ScalarSelectNoArgs<ATy>> for AliasSelection {
    fn from(val: ScalarSelectNoArgs<ATy>) -> Self {
        use ScalarSelectNoArgs::*;
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

impl<SelT, ATy> From<CompositeSelectNoArgs<SelT, ATy>> for AliasSelection
where
    SelT: Into<SelectionErasedMap>,
{
    fn from(val: CompositeSelectNoArgs<SelT, ATy>) -> Self {
        use CompositeSelectNoArgs::*;
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
        impl<ATy> From<$ty<ATy>> for SelectionErasedMap {
            fn from(value: $ty<ATy>) -> SelectionErasedMap {
                SelectionErasedMap(
                    [
                        $((stringify!($field).into(), value.$field.into()),)+
                    ]
                    .into(),
                )
            }
        }

        impl<ATy> Selection for $ty<ATy> {
            fn all() -> Self {
                Self {
                    $($field: all(),)+
                }
            }
        }
    };
}

//
// --- --- Argument types --- --- //
//

type NodeArgs = HashMap<CowStr, NodeArgValue>;

struct NodeArgValue {
    type_name: CowStr,
    value: serde_json::Value,
}

/* pub struct PreparedArgs;

impl PreparedArgs {
    pub fn get<Arg>(&mut self, key: impl Into<CowStr>) -> PlaceholderValue<Arg> {
        PlaceholderValue {
            key: key.into(),
            _phantom: PhantomData,
        }
    }
}

pub struct PlaceholderValue<Arg> {
    key: CowStr,
    _phantom: PhantomData<Arg>,
}

pub struct PlaceholderArgs<Arg>(Arg); */

//
// --- --- GraphQL types --- --- //
//

pub use graphql::*;
mod graphql {
    use super::*;

    pub(super) type TyToGqlTyMap = std::sync::Arc<HashMap<CowStr, CowStr>>;

    #[derive(Default)]
    pub struct GraphQlTransportOptions {
        headers: reqwest::header::HeaderMap,
        timeout: Option<std::time::Duration>,
    }

    fn select_node_to_gql(
        dest: &mut impl std::fmt::Write,
        node: SelectNodeErased,
        variables: &mut HashMap<CowStr, NodeArgValue>,
    ) -> std::fmt::Result {
        if node.instance_name != node.node_name {
            write!(dest, "{}: {}", node.instance_name, node.node_name)?;
        } else {
            write!(dest, "{}", node.node_name)?;
        }
        if let Some(args) = node.args {
            if !args.is_empty() {
                write!(dest, "(")?;
                for (key, val) in args {
                    let name = format!("in{}", variables.len());
                    write!(dest, "{key}: ${name}, ")?;
                    variables.insert(name.into(), val);
                }
                write!(dest, ")")?;
            }
        }
        if !node.sub_nodes.is_empty() {
            write!(dest, "{{ ")?;
            for node in node.sub_nodes {
                select_node_to_gql(dest, node, variables)?;
                write!(dest, " ")?;
            }
            write!(dest, " }}")?;
        }
        Ok(())
    }

    fn build_gql_doc(
        ty_to_gql_ty_map: &TyToGqlTyMap,
        query: Vec<SelectNodeErased>,
        ty: &'static str,
        name: Option<CowStr>,
    ) -> Result<(String, serde_json::Value), GraphQLRequestError> {
        use std::fmt::Write;
        let mut variables = HashMap::new();
        let mut root_nodes = String::new();
        for node in query {
            write!(&mut root_nodes, "  ").expect("error building to string");
            select_node_to_gql(&mut root_nodes, node, &mut variables)
                .expect("error building to string");
            writeln!(&mut root_nodes).expect("error building to string");
        }
        let mut args_row = String::new();
        if !variables.is_empty() {
            write!(&mut args_row, "(").expect("error building to string");
            for (key, val) in &variables {
                let gql_ty = ty_to_gql_ty_map.get(&val.type_name[..]).ok_or_else(|| {
                    GraphQLRequestError::InvalidQuery {
                        error: Box::from(format!(
                            "unknown typegraph type found: {}",
                            val.type_name
                        )),
                    }
                })?;
                write!(&mut args_row, "${key}: {gql_ty}, ").expect("error building to string");
            }
            write!(&mut args_row, ")").expect("error building to string");
        }
        let name = name.unwrap_or_else(|| "".into());
        let doc = format!("{ty} {name}{args_row} {{\n{root_nodes}}}");
        Ok((
            doc,
            serde_json::Value::Object(
                variables
                    .into_iter()
                    .map(|(key, val)| (key.into(), val.value))
                    .collect(),
            ),
        ))
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
        variables: &serde_json::Value,
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

    fn handle_response(response: GraphQLResponse) -> Result<JsonObject, GraphQLRequestError> {
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
        let Some(body) = body.data else {
            return Err(GraphQLRequestError::BodyError {
                error: Box::from("body response doesn't contain data field"),
            });
        };
        Ok(body)
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
            error: Box<dyn std::error::Error>,
        },
        /// Unable to make http request
        NetworkError {
            error: Box<dyn std::error::Error>,
        },
        InvalidQuery {
            error: Box<dyn std::error::Error>,
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

    pub struct GraphQlTransportReqwestSync {
        addr: Url,
        ty_to_gql_ty_map: TyToGqlTyMap,
        client: reqwest::blocking::Client,
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
            let doc = nodes
                .into_iter()
                .enumerate()
                .map(|(idx, node)| SelectNodeErased {
                    instance_name: format!("node{idx}").into(),
                    ..node
                })
                .collect::<Vec<_>>();
            let doc_len = doc.len();

            let doc = build_gql_doc(&self.ty_to_gql_ty_map, doc, ty, None)?;
            // let (doc, variables) = dbg!(doc);
            let (doc, variables) = doc;
            let req = build_gql_req(self.addr.clone(), &doc, &variables, opts);
            // dbg!(serde_json::to_string_pretty(&req.body).expect("error serializing body"));
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
            let mut resp = match req.send() {
                Ok(res) => {
                    let status = res.status();
                    let headers = res.headers().clone();
                    match res.json::<JsonObject>() {
                        Ok(body) => handle_response(GraphQLResponse {
                            status,
                            headers,
                            body,
                        })?,
                        Err(error) => {
                            return Err(GraphQLRequestError::BodyError {
                                error: Box::new(error),
                            })
                        }
                    }
                }
                Err(error) => {
                    return Err(GraphQLRequestError::NetworkError {
                        error: Box::new(error),
                    })
                }
            };
            let resp = (0..doc_len)
                .map(|idx| {
                    resp.remove(&format!("node{idx}")).ok_or_else(|| {
                        GraphQLRequestError::BodyError {
                            error: Box::from(format!(
                                "expecting response under node key 'node{idx}' but none found"
                            )),
                        }
                    })
                })
                .collect::<Result<Vec<_>, _>>()?;
            Ok(resp)
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
    }
}

//
// --- --- QueryGraph types --- --- //
//

pub struct QueryGraph {
    ty_to_gql_ty_map: TyToGqlTyMap,
    addr: Url,
}

impl QueryGraph {
    pub fn graphql_sync(&self) -> GraphQlTransportReqwestSync {
        GraphQlTransportReqwestSync::new(self.addr.clone(), self.ty_to_gql_ty_map.clone())
    }
}

//
// --- --- Typegraph types --- --- //
//
