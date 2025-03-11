// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::selection::{selection_to_node_set, SelectionErased, SelectionErasedMap};

use crate::{
    args::{NodeArgsErased, NodeArgsMerged},
    files::PathToInputFiles,
    interlude::*,
    selection::CompositeSelection,
};

pub type NodeMetaFn = fn() -> NodeMeta;

/// How the [`node_metas`] module encodes the description
/// of the typegraph.
pub struct NodeMeta {
    pub sub_nodes: Option<HashMap<CowStr, NodeMetaFn>>,
    pub arg_types: Option<HashMap<CowStr, CowStr>>,
    pub variants: Option<HashMap<CowStr, NodeMetaFn>>,
    pub input_files: Option<PathToInputFiles>,
}

#[derive(Debug)]
pub enum SubNodes {
    None,
    Atomic(Vec<SelectNodeErased>),
    Union(HashMap<CowStr, Vec<SelectNodeErased>>),
}

/// The final form of the nodes used in queries.
#[derive(Debug)]
pub struct SelectNodeErased {
    pub node_name: CowStr,
    pub instance_name: CowStr,
    pub args: Option<NodeArgsMerged>,
    pub sub_nodes: SubNodes,
    pub input_files: Option<PathToInputFiles>,
}

/// Wrappers around [`SelectNodeErased`] that only holds query nodes
pub struct QueryNode<Out>(pub SelectNodeErased, pub PhantomData<(Out,)>);
/// Wrappers around [`SelectNodeErased`] that only holds mutation nodes
pub struct MutationNode<Out>(pub SelectNodeErased, pub PhantomData<(Out,)>);

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
    pub root_name: CowStr,
    pub root_meta: NodeMetaFn,
    pub args: NodeArgsErased,
    pub _marker: PhantomData<(SelT, SelAliasedT, QTy, Out)>,
}

impl<SelT, SelAliased, QTy, Out> UnselectedNode<SelT, SelAliased, QTy, Out>
where
    SelT: Into<CompositeSelection>,
{
    fn select_erased(self, select: SelT) -> SelectNodeErased {
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
        )
        .unwrap();
        nodes.into_iter().next().unwrap()
    }
}

impl<SelT, SelAliased, QTy, Out> UnselectedNode<SelT, SelAliased, QTy, Out>
where
    SelAliased: Into<CompositeSelection>,
{
    fn select_aliased_erased(self, select: SelAliased) -> SelectNodeErased {
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
        )
        .unwrap();
        nodes.into_iter().next().unwrap()
    }
}

// NOTE: we'll need a select method implementation for each ATy x QTy pair

impl<SelT, SelAliased, Out> UnselectedNode<SelT, SelAliased, QueryMarker, Out>
where
    SelT: Into<CompositeSelection>,
{
    pub fn select(self, select: SelT) -> QueryNode<Out> {
        QueryNode(self.select_erased(select), PhantomData)
    }
}
impl<SelT, SelAliased, Out> UnselectedNode<SelT, SelAliased, QueryMarker, Out>
where
    SelAliased: Into<CompositeSelection>,
{
    pub fn select_aliased(self, select: SelAliased) -> QueryNode<serde_json::Value> {
        QueryNode(self.select_aliased_erased(select), PhantomData)
    }
}
impl<SelT, SelAliased, Out> UnselectedNode<SelT, SelAliased, MutationMarker, Out>
where
    SelT: Into<CompositeSelection>,
{
    pub fn select(self, select: SelT) -> MutationNode<Out> {
        MutationNode(self.select_erased(select), PhantomData)
    }
}
impl<SelT, SelAliased, Out> UnselectedNode<SelT, SelAliased, MutationMarker, Out>
where
    SelAliased: Into<CompositeSelection>,
{
    pub fn select_aliased(self, select: SelAliased) -> MutationNode<serde_json::Value> {
        MutationNode(self.select_aliased_erased(select), PhantomData)
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
