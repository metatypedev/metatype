// This file was @generated by metagen and is intended
// to be generated again on subsequent metagen runs.

use core::marker::PhantomData;
use metagen_client::prelude::*;

/// Contains constructors for the different transports supported
/// by the typegate. Namely:
/// - GraphQl transports ([sync](transports::graphql)/[async](transports::graphql_sync)): reqwest
///   based transports that talk to the typegate using GraphQl over HTTP.
/// - [Hostcall transport](transports::hostcall): used by custom functions running in the typegate to access typegraphs.
pub mod transports {
    use super::*;

    pub fn graphql(qg: &QueryGraph, addr: Url) -> GraphQlTransportReqwest {
        GraphQlTransportReqwest::new(addr, qg.ty_to_gql_ty_map.clone())
    }

    #[cfg(not(target_family = "wasm"))]
    pub fn graphql_sync(qg: &QueryGraph, addr: Url) -> GraphQlTransportReqwestSync {
        GraphQlTransportReqwestSync::new(addr, qg.ty_to_gql_ty_map.clone())
    }

}

//
// --- --- QueryGraph types --- --- //
//

#[derive(Clone)]
pub struct QueryGraph {
    ty_to_gql_ty_map: TyToGqlTyMap,
}

//
// --- --- Typegraph types --- --- //
//

#[allow(non_snake_case)]
mod node_metas {
    use super::*;
    pub fn scalar() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            sub_nodes: None,
            variants: None,
            input_files: None,
        }
    }    
    pub fn Post() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            variants: None,
            sub_nodes: Some(
                [
                    ("id".into(), scalar as NodeMetaFn),
                    ("slug".into(), scalar as NodeMetaFn),
                    ("title".into(), scalar as NodeMetaFn),
                ].into()
            ),
            input_files: None,
        }
    }
    pub fn User() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            variants: None,
            sub_nodes: Some(
                [
                    ("id".into(), scalar as NodeMetaFn),
                    ("email".into(), scalar as NodeMetaFn),
                    ("posts".into(), Post as NodeMetaFn),
                ].into()
            ),
            input_files: None,
        }
    }
    pub fn RootGetUserFn() -> NodeMeta {
        NodeMeta {
            ..User()
        }
    }
    pub fn RootGetPostsFn() -> NodeMeta {
        NodeMeta {
            ..Post()
        }
    }
    pub fn RootScalarNoArgsFn() -> NodeMeta {
        NodeMeta {
            ..scalar()
        }
    }
    pub fn RootScalarArgsFn() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("id".into(), "UserIdStringUuid".into()),
                    ("slug".into(), "StringE1a43".into()),
                    ("title".into(), "StringE1a43".into()),
                ].into()
            ),
            ..scalar()
        }
    }
    pub fn RootCompositeNoArgsFn() -> NodeMeta {
        NodeMeta {
            ..Post()
        }
    }
    pub fn RootCompositeArgsFn() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("id".into(), "StringE1a43".into()),
                ].into()
            ),
            ..Post()
        }
    }
    pub fn RootScalarUnionFn() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("id".into(), "StringE1a43".into()),
                ].into()
            ),
            ..scalar()
        }
    }
    pub fn RootCompositeUnionFnOutput() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            sub_nodes: None,
            variants: Some(
                [
                    ("post".into(), Post as NodeMetaFn),
                    ("user".into(), User as NodeMetaFn),
                ].into()
            ),
            input_files: None,
        }
    }
    pub fn RootCompositeUnionFn() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("id".into(), "StringE1a43".into()),
                ].into()
            ),
            ..RootCompositeUnionFnOutput()
        }
    }
    pub fn RootMixedUnionFnOutput() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            sub_nodes: None,
            variants: Some(
                [
                    ("post".into(), Post as NodeMetaFn),
                    ("user".into(), User as NodeMetaFn),
                ].into()
            ),
            input_files: None,
        }
    }
    pub fn RootMixedUnionFn() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("id".into(), "StringE1a43".into()),
                ].into()
            ),
            ..RootMixedUnionFnOutput()
        }
    }
    pub fn RootNestedCompositeFnOutputCompositeStructNestedStruct() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            variants: None,
            sub_nodes: Some(
                [
                    ("inner".into(), scalar as NodeMetaFn),
                ].into()
            ),
            input_files: None,
        }
    }
    pub fn RootNestedCompositeFnOutputCompositeStruct() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            variants: None,
            sub_nodes: Some(
                [
                    ("value".into(), scalar as NodeMetaFn),
                    ("nested".into(), RootNestedCompositeFnOutputCompositeStructNestedStruct as NodeMetaFn),
                ].into()
            ),
            input_files: None,
        }
    }
    pub fn RootNestedCompositeFnOutputListStruct() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            variants: None,
            sub_nodes: Some(
                [
                    ("value".into(), scalar as NodeMetaFn),
                ].into()
            ),
            input_files: None,
        }
    }
    pub fn RootNestedCompositeFnOutput() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            variants: None,
            sub_nodes: Some(
                [
                    ("scalar".into(), scalar as NodeMetaFn),
                    ("composite".into(), RootNestedCompositeFnOutputCompositeStruct as NodeMetaFn),
                    ("list".into(), RootNestedCompositeFnOutputListStruct as NodeMetaFn),
                ].into()
            ),
            input_files: None,
        }
    }
    pub fn RootNestedCompositeFn() -> NodeMeta {
        NodeMeta {
            ..RootNestedCompositeFnOutput()
        }
    }
    pub fn RootIdentityFnInput() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            variants: None,
            sub_nodes: Some(
                [
                    ("input".into(), scalar as NodeMetaFn),
                ].into()
            ),
            input_files: None,
        }
    }
    pub fn RootIdentityFn() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("input".into(), "Integer64be4".into()),
                ].into()
            ),
            ..RootIdentityFnInput()
        }
    }
    pub fn RootIdentityUpdateFn() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("input".into(), "Integer64be4".into()),
                ].into()
            ),
            ..RootIdentityFnInput()
        }
    }

}
use types::*;
#[allow(unused)]
pub mod types {
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootGetUserFnInput {
    }
    pub type UserIdStringUuid = String;
    pub type UserEmailStringEmail = String;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct Post {
        pub id: UserIdStringUuid,
        pub slug: String,
        pub title: String,
    }
    pub type UserPostsPostList = Vec<Post>;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct User {
        pub id: UserIdStringUuid,
        pub email: UserEmailStringEmail,
        pub posts: UserPostsPostList,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootCompositeArgsFnInput {
        pub id: String,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(untagged)]
    pub enum RootScalarUnionFnOutput {
        String(String),
        I64(i64),
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(untagged)]
    pub enum RootCompositeUnionFnOutput {
        Post(Post),
        User(User),
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(untagged)]
    pub enum RootMixedUnionFnOutput {
        Post(Post),
        User(User),
        String(String),
        I64(i64),
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootNestedCompositeFnOutputCompositeStructNestedStruct {
        pub inner: i64,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootNestedCompositeFnOutputCompositeStruct {
        pub value: i64,
        pub nested: RootNestedCompositeFnOutputCompositeStructNestedStruct,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootNestedCompositeFnOutputListStruct {
        pub value: i64,
    }
    pub type RootNestedCompositeFnOutputListRootNestedCompositeFnOutputListStructList = Vec<RootNestedCompositeFnOutputListStruct>;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootNestedCompositeFnOutput {
        pub scalar: i64,
        pub composite: RootNestedCompositeFnOutputCompositeStruct,
        pub list: RootNestedCompositeFnOutputListRootNestedCompositeFnOutputListStructList,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootIdentityFnInput {
        pub input: i64,
    }
}
#[allow(unused)]
pub mod return_types {
    use super::types::*;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct PostPartial {
        pub id: Option<UserIdStringUuid>,
        pub slug: Option<String>,
        pub title: Option<String>,
    }
    pub type UserPostsPostList = Vec<PostPartial>;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct UserPartial {
        pub id: Option<UserIdStringUuid>,
        pub email: Option<UserEmailStringEmail>,
        pub posts: Option<UserPostsPostList>,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(untagged)]
    pub enum RootCompositeUnionFnOutput {
        PostPartial(PostPartial),
        UserPartial(UserPartial),
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(untagged)]
    pub enum RootMixedUnionFnOutput {
        PostPartial(PostPartial),
        UserPartial(UserPartial),
        String(String),
        I64(i64),
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootNestedCompositeFnOutputCompositeStructNestedStructPartial {
        pub inner: Option<i64>,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootNestedCompositeFnOutputCompositeStructPartial {
        pub value: Option<i64>,
        pub nested: Option<RootNestedCompositeFnOutputCompositeStructNestedStructPartial>,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootNestedCompositeFnOutputListStructPartial {
        pub value: Option<i64>,
    }
    pub type RootNestedCompositeFnOutputListRootNestedCompositeFnOutputListStructList = Vec<RootNestedCompositeFnOutputListStructPartial>;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootNestedCompositeFnOutputPartial {
        pub scalar: Option<i64>,
        pub composite: Option<RootNestedCompositeFnOutputCompositeStructPartial>,
        pub list: Option<RootNestedCompositeFnOutputListRootNestedCompositeFnOutputListStructList>,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootIdentityFnInputPartial {
        pub input: Option<i64>,
    }
}
#[derive(Default, Debug)]
pub struct PostSelections<ATy = NoAlias> {
    pub id: ScalarSelect<ATy>,
    pub slug: ScalarSelect<ATy>,
    pub title: ScalarSelect<ATy>,
}
impl_selection_traits!(PostSelections, id, slug, title);
#[derive(Default, Debug)]
pub struct UserSelections<ATy = NoAlias> {
    pub id: ScalarSelect<ATy>,
    pub email: ScalarSelect<ATy>,
    pub posts: CompositeSelect<PostSelections<ATy>, ATy>,
}
impl_selection_traits!(UserSelections, id, email, posts);
#[derive(Default, Debug)]
pub struct RootCompositeUnionFnOutputSelections<ATy = NoAlias> {
    pub post: CompositeSelect<PostSelections<ATy>, NoAlias>,
    pub user: CompositeSelect<UserSelections<ATy>, NoAlias>,
}
impl_union_selection_traits!(RootCompositeUnionFnOutputSelections, ("post", post), ("user", user));
#[derive(Default, Debug)]
pub struct RootMixedUnionFnOutputSelections<ATy = NoAlias> {
    pub post: CompositeSelect<PostSelections<ATy>, NoAlias>,
    pub user: CompositeSelect<UserSelections<ATy>, NoAlias>,
}
impl_union_selection_traits!(RootMixedUnionFnOutputSelections, ("post", post), ("user", user));
#[derive(Default, Debug)]
pub struct RootNestedCompositeFnOutputCompositeStructNestedStructSelections<ATy = NoAlias> {
    pub inner: ScalarSelect<ATy>,
}
impl_selection_traits!(RootNestedCompositeFnOutputCompositeStructNestedStructSelections, inner);
#[derive(Default, Debug)]
pub struct RootNestedCompositeFnOutputCompositeStructSelections<ATy = NoAlias> {
    pub value: ScalarSelect<ATy>,
    pub nested: CompositeSelect<RootNestedCompositeFnOutputCompositeStructNestedStructSelections<ATy>, ATy>,
}
impl_selection_traits!(RootNestedCompositeFnOutputCompositeStructSelections, value, nested);
#[derive(Default, Debug)]
pub struct RootNestedCompositeFnOutputListStructSelections<ATy = NoAlias> {
    pub value: ScalarSelect<ATy>,
}
impl_selection_traits!(RootNestedCompositeFnOutputListStructSelections, value);
#[derive(Default, Debug)]
pub struct RootNestedCompositeFnOutputSelections<ATy = NoAlias> {
    pub scalar: ScalarSelect<ATy>,
    pub composite: CompositeSelect<RootNestedCompositeFnOutputCompositeStructSelections<ATy>, ATy>,
    pub list: CompositeSelect<RootNestedCompositeFnOutputListStructSelections<ATy>, ATy>,
}
impl_selection_traits!(RootNestedCompositeFnOutputSelections, scalar, composite, list);
#[derive(Default, Debug)]
pub struct RootIdentityFnInputSelections<ATy = NoAlias> {
    pub input: ScalarSelect<ATy>,
}
impl_selection_traits!(RootIdentityFnInputSelections, input);

pub fn query_graph() -> QueryGraph {
    QueryGraph {
        ty_to_gql_ty_map: std::sync::Arc::new([
        
            ("UserIdStringUuid".into(), "String!".into()),
            ("StringE1a43".into(), "String!".into()),
            ("Integer64be4".into(), "Int!".into()),
            ("post".into(), "post!".into()),
            ("user".into(), "user!".into()),
        ].into()),
    }
}
impl QueryGraph {

    pub fn get_user(
        &self,
    ) -> UnselectedNode<UserSelections, UserSelections<HasAlias>, QueryMarker, return_types::UserPartial>
    {
        UnselectedNode {
            root_name: "getUser".into(),
            root_meta: node_metas::RootGetUserFn,
            args: NodeArgsErased::None,
            _marker: PhantomData,
        }
    }
    pub fn get_posts(
        &self,
    ) -> UnselectedNode<PostSelections, PostSelections<HasAlias>, QueryMarker, return_types::PostPartial>
    {
        UnselectedNode {
            root_name: "getPosts".into(),
            root_meta: node_metas::RootGetPostsFn,
            args: NodeArgsErased::None,
            _marker: PhantomData,
        }
    }
    pub fn scalar_no_args(
        &self,
    ) -> QueryNode<String>
    {
        let nodes = selection_to_node_set(
            SelectionErasedMap(
                [(
                    "scalarNoArgs".into(),
                    SelectionErased::Scalar,
                )]
                .into(),
            ),
            &[
                ("scalarNoArgs".into(), node_metas::RootScalarNoArgsFn as NodeMetaFn),
            ].into(),
            "$q".into(),
        )
        .unwrap();
        QueryNode(nodes.into_iter().next().unwrap(), PhantomData)
    }
    pub fn scalar_args(
        &self,
        args: impl Into<NodeArgs<Post>>
    ) -> MutationNode<String>
    {
        let nodes = selection_to_node_set(
            SelectionErasedMap(
                [(
                    "scalarArgs".into(),
                    SelectionErased::ScalarArgs(args.into().into()),
                )]
                .into(),
            ),
            &[
                ("scalarArgs".into(), node_metas::RootScalarArgsFn as NodeMetaFn),
            ].into(),
            "$q".into(),
        )
        .unwrap();
        MutationNode(nodes.into_iter().next().unwrap(), PhantomData)
    }
    pub fn composite_no_args(
        &self,
    ) -> UnselectedNode<PostSelections, PostSelections<HasAlias>, MutationMarker, return_types::PostPartial>
    {
        UnselectedNode {
            root_name: "compositeNoArgs".into(),
            root_meta: node_metas::RootCompositeNoArgsFn,
            args: NodeArgsErased::None,
            _marker: PhantomData,
        }
    }
    pub fn composite_args(
        &self,
        args: impl Into<NodeArgs<RootCompositeArgsFnInput>>
    ) -> UnselectedNode<PostSelections, PostSelections<HasAlias>, MutationMarker, return_types::PostPartial>
    {
        UnselectedNode {
            root_name: "compositeArgs".into(),
            root_meta: node_metas::RootCompositeArgsFn,
            args: args.into().into(),
            _marker: PhantomData,
        }
    }
    pub fn scalar_union(
        &self,
        args: impl Into<NodeArgs<RootCompositeArgsFnInput>>
    ) -> QueryNode<RootScalarUnionFnOutput>
    {
        let nodes = selection_to_node_set(
            SelectionErasedMap(
                [(
                    "scalarUnion".into(),
                    SelectionErased::ScalarArgs(args.into().into()),
                )]
                .into(),
            ),
            &[
                ("scalarUnion".into(), node_metas::RootScalarUnionFn as NodeMetaFn),
            ].into(),
            "$q".into(),
        )
        .unwrap();
        QueryNode(nodes.into_iter().next().unwrap(), PhantomData)
    }
    pub fn composite_union(
        &self,
        args: impl Into<NodeArgs<RootCompositeArgsFnInput>>
    ) -> UnselectedNode<RootCompositeUnionFnOutputSelections, RootCompositeUnionFnOutputSelections<HasAlias>, QueryMarker, return_types::RootCompositeUnionFnOutput>
    {
        UnselectedNode {
            root_name: "compositeUnion".into(),
            root_meta: node_metas::RootCompositeUnionFn,
            args: args.into().into(),
            _marker: PhantomData,
        }
    }
    pub fn mixed_union(
        &self,
        args: impl Into<NodeArgs<RootCompositeArgsFnInput>>
    ) -> UnselectedNode<RootMixedUnionFnOutputSelections, RootMixedUnionFnOutputSelections<HasAlias>, QueryMarker, return_types::RootMixedUnionFnOutput>
    {
        UnselectedNode {
            root_name: "mixedUnion".into(),
            root_meta: node_metas::RootMixedUnionFn,
            args: args.into().into(),
            _marker: PhantomData,
        }
    }
    pub fn nested_composite(
        &self,
    ) -> UnselectedNode<RootNestedCompositeFnOutputSelections, RootNestedCompositeFnOutputSelections<HasAlias>, QueryMarker, return_types::RootNestedCompositeFnOutputPartial>
    {
        UnselectedNode {
            root_name: "nestedComposite".into(),
            root_meta: node_metas::RootNestedCompositeFn,
            args: NodeArgsErased::None,
            _marker: PhantomData,
        }
    }
    pub fn identity(
        &self,
        args: impl Into<NodeArgs<RootIdentityFnInput>>
    ) -> UnselectedNode<RootIdentityFnInputSelections, RootIdentityFnInputSelections<HasAlias>, QueryMarker, return_types::RootIdentityFnInputPartial>
    {
        UnselectedNode {
            root_name: "identity".into(),
            root_meta: node_metas::RootIdentityFn,
            args: args.into().into(),
            _marker: PhantomData,
        }
    }
    pub fn identity_update(
        &self,
        args: impl Into<NodeArgs<RootIdentityFnInput>>
    ) -> UnselectedNode<RootIdentityFnInputSelections, RootIdentityFnInputSelections<HasAlias>, MutationMarker, return_types::RootIdentityFnInputPartial>
    {
        UnselectedNode {
            root_name: "identityUpdate".into(),
            root_meta: node_metas::RootIdentityUpdateFn,
            args: args.into().into(),
            _marker: PhantomData,
        }
    }
}
