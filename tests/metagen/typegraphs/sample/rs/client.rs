// This file was @generated by metagen and is intended
// to be generated again on subsequent metagen runs.

use core::marker::PhantomData;
use metagen_client::prelude::*;

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
    pub fn RootCompositeUnionFn() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("id".into(), "string_e1a43".into()),
                ].into()
            ),
            ..RootCompositeUnionFnOutput()
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
    pub fn User() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            variants: None,
            sub_nodes: Some(
                [
                    ("email".into(), scalar as NodeMetaFn),
                    ("id".into(), scalar as NodeMetaFn),
                    ("posts".into(), Post as NodeMetaFn),
                ].into()
            ),
            input_files: None,
        }
    }
    pub fn Post() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            variants: None,
            sub_nodes: Some(
                [
                    ("slug".into(), scalar as NodeMetaFn),
                    ("title".into(), scalar as NodeMetaFn),
                    ("id".into(), scalar as NodeMetaFn),
                ].into()
            ),
            input_files: None,
        }
    }
    pub fn RootScalarNoArgsFn() -> NodeMeta {
        NodeMeta {
            ..scalar()
        }
    }
    pub fn RootGetPostsFn() -> NodeMeta {
        NodeMeta {
            ..Post()
        }
    }
    pub fn RootGetUserFn() -> NodeMeta {
        NodeMeta {
            ..User()
        }
    }
    pub fn RootCompositeNoArgsFn() -> NodeMeta {
        NodeMeta {
            ..Post()
        }
    }
    pub fn RootScalarUnionFn() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("id".into(), "string_e1a43".into()),
                ].into()
            ),
            ..scalar()
        }
    }
    pub fn RootIdentityUpdateFn() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("input".into(), "integer_64be4".into()),
                ].into()
            ),
            ..RootIdentityFnInput()
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
                    ("input".into(), "integer_64be4".into()),
                ].into()
            ),
            ..RootIdentityFnInput()
        }
    }
    pub fn RootNestedCompositeFn() -> NodeMeta {
        NodeMeta {
            ..RootNestedCompositeFnOutput()
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
    pub fn RootScalarArgsFn() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("id".into(), "user_id_string_uuid".into()),
                    ("slug".into(), "string_e1a43".into()),
                    ("title".into(), "string_e1a43".into()),
                ].into()
            ),
            ..scalar()
        }
    }
    pub fn RootMixedUnionFn() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("id".into(), "string_e1a43".into()),
                ].into()
            ),
            ..RootMixedUnionFnOutput()
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
    pub fn RootCompositeArgsFn() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("id".into(), "string_e1a43".into()),
                ].into()
            ),
            ..Post()
        }
    }

}
use types::*;
pub mod types {
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootGetUserFnInput {
    }
    pub type UserIdStringUuid = String;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct Post {
        pub slug: String,
        pub title: String,
        pub id: UserIdStringUuid,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootCompositeArgsFnInput {
        pub id: String,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootIdentityFnInput {
        pub input: i64,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct UserPartial {
        pub email: Option<UserEmailStringEmail>,
        pub id: Option<UserIdStringUuid>,
        pub posts: Option<UserPostsPostList>,
    }
    pub type UserEmailStringEmail = String;
    pub type UserPostsPostList = Vec<Box<PostPartial>>;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct PostPartial {
        pub slug: Option<String>,
        pub title: Option<String>,
        pub id: Option<UserIdStringUuid>,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(untagged)]
    pub enum RootScalarUnionFnOutput {
        StringE1a43(String),
        Integer64be4(i64),
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(untagged)]
    pub enum RootCompositeUnionFnOutputPartial {
        Post(PostPartial),
        User(UserPartial),
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(untagged)]
    pub enum RootMixedUnionFnOutputPartial {
        Post(PostPartial),
        User(UserPartial),
        StringE1a43(String),
        Integer64be4(i64),
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootNestedCompositeFnOutputPartial {
        pub scalar: Option<i64>,
        pub composite: Option<RootNestedCompositeFnOutputCompositeStructPartial>,
        pub list: Option<RootNestedCompositeFnOutputListRootNestedCompositeFnOutputListStructList>,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootNestedCompositeFnOutputCompositeStructPartial {
        pub value: Option<i64>,
        pub nested: Option<RootNestedCompositeFnOutputCompositeStructNestedStructPartial>,
    }
    pub type RootNestedCompositeFnOutputListRootNestedCompositeFnOutputListStructList = Vec<Box<RootNestedCompositeFnOutputListStructPartial>>;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootNestedCompositeFnOutputCompositeStructNestedStructPartial {
        pub inner: Option<i64>,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootNestedCompositeFnOutputListStructPartial {
        pub value: Option<i64>,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootIdentityFnInputPartial {
        pub input: Option<i64>,
    }
}
#[derive(Default, Debug)]
pub struct UserSelections<ATy = NoAlias> {
    pub email: ScalarSelect<ATy>,
    pub id: ScalarSelect<ATy>,
    pub posts: CompositeSelect<PostSelections<ATy>, ATy>,
}
impl_selection_traits!(UserSelections, email, id, posts);
#[derive(Default, Debug)]
pub struct PostSelections<ATy = NoAlias> {
    pub slug: ScalarSelect<ATy>,
    pub title: ScalarSelect<ATy>,
    pub id: ScalarSelect<ATy>,
}
impl_selection_traits!(PostSelections, slug, title, id);
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
pub struct RootNestedCompositeFnOutputSelections<ATy = NoAlias> {
    pub scalar: ScalarSelect<ATy>,
    pub composite: CompositeSelect<RootNestedCompositeFnOutputCompositeStructSelections<ATy>, ATy>,
    pub list: CompositeSelect<RootNestedCompositeFnOutputListStructSelections<ATy>, ATy>,
}
impl_selection_traits!(RootNestedCompositeFnOutputSelections, scalar, composite, list);
#[derive(Default, Debug)]
pub struct RootNestedCompositeFnOutputCompositeStructSelections<ATy = NoAlias> {
    pub value: ScalarSelect<ATy>,
    pub nested: CompositeSelect<RootNestedCompositeFnOutputCompositeStructNestedStructSelections<ATy>, ATy>,
}
impl_selection_traits!(RootNestedCompositeFnOutputCompositeStructSelections, value, nested);
#[derive(Default, Debug)]
pub struct RootNestedCompositeFnOutputCompositeStructNestedStructSelections<ATy = NoAlias> {
    pub inner: ScalarSelect<ATy>,
}
impl_selection_traits!(RootNestedCompositeFnOutputCompositeStructNestedStructSelections, inner);
#[derive(Default, Debug)]
pub struct RootNestedCompositeFnOutputListStructSelections<ATy = NoAlias> {
    pub value: ScalarSelect<ATy>,
}
impl_selection_traits!(RootNestedCompositeFnOutputListStructSelections, value);
#[derive(Default, Debug)]
pub struct RootIdentityFnInputSelections<ATy = NoAlias> {
    pub input: ScalarSelect<ATy>,
}
impl_selection_traits!(RootIdentityFnInputSelections, input);

impl QueryGraph {

    pub fn new(addr: Url) -> Self {
        Self {
            addr,
            ty_to_gql_ty_map: std::sync::Arc::new([
                ("string_e1a43".into(), "String!".into()),
                ("user_id_string_uuid".into(), "ID!".into()),
                ("integer_64be4".into(), "Int!".into()),
                ("post".into(), "post!".into()),
                ("user".into(), "user!".into()),
            ].into()),
        }
    }
    
    pub fn composite_args(
        &self,
            args: impl Into<NodeArgs<RootCompositeArgsFnInput>>
    ) -> UnselectedNode<PostSelections, PostSelections<HasAlias>, MutationMarker, PostPartial>
    {
        UnselectedNode {
            root_name: "compositeArgs".into(),
            root_meta: node_metas::RootCompositeArgsFn,
            args: args.into().into(),
            _marker: PhantomData,
        }
    }
    pub fn mixed_union(
        &self,
            args: impl Into<NodeArgs<RootCompositeArgsFnInput>>
    ) -> UnselectedNode<RootMixedUnionFnOutputSelections, RootMixedUnionFnOutputSelections<HasAlias>, QueryMarker, RootMixedUnionFnOutputPartial>
    {
        UnselectedNode {
            root_name: "mixedUnion".into(),
            root_meta: node_metas::RootMixedUnionFn,
            args: args.into().into(),
            _marker: PhantomData,
        }
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
    pub fn nested_composite(
        &self,
    ) -> UnselectedNode<RootNestedCompositeFnOutputSelections, RootNestedCompositeFnOutputSelections<HasAlias>, QueryMarker, RootNestedCompositeFnOutputPartial>
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
    ) -> UnselectedNode<RootIdentityFnInputSelections, RootIdentityFnInputSelections<HasAlias>, QueryMarker, RootIdentityFnInputPartial>
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
    ) -> UnselectedNode<RootIdentityFnInputSelections, RootIdentityFnInputSelections<HasAlias>, MutationMarker, RootIdentityFnInputPartial>
    {
        UnselectedNode {
            root_name: "identityUpdate".into(),
            root_meta: node_metas::RootIdentityUpdateFn,
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
    pub fn composite_no_args(
        &self,
    ) -> UnselectedNode<PostSelections, PostSelections<HasAlias>, MutationMarker, PostPartial>
    {
        UnselectedNode {
            root_name: "compositeNoArgs".into(),
            root_meta: node_metas::RootCompositeNoArgsFn,
            args: NodeArgsErased::None,
            _marker: PhantomData,
        }
    }
    pub fn get_user(
        &self,
    ) -> UnselectedNode<UserSelections, UserSelections<HasAlias>, QueryMarker, UserPartial>
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
    ) -> UnselectedNode<PostSelections, PostSelections<HasAlias>, QueryMarker, PostPartial>
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
    pub fn composite_union(
        &self,
            args: impl Into<NodeArgs<RootCompositeArgsFnInput>>
    ) -> UnselectedNode<RootCompositeUnionFnOutputSelections, RootCompositeUnionFnOutputSelections<HasAlias>, QueryMarker, RootCompositeUnionFnOutputPartial>
    {
        UnselectedNode {
            root_name: "compositeUnion".into(),
            root_meta: node_metas::RootCompositeUnionFn,
            args: args.into().into(),
            _marker: PhantomData,
        }
    }
}

