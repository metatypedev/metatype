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
                    ("id".into(), "ScalarStringUuid1".into()),
                    ("slug".into(), "ScalarString1".into()),
                    ("title".into(), "ScalarString1".into()),
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
                    ("id".into(), "ScalarString1".into()),
                ].into()
            ),
            ..Post()
        }
    }
    pub fn RootScalarUnionFn() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("id".into(), "ScalarString1".into()),
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
                    ("id".into(), "ScalarString1".into()),
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
                    ("id".into(), "ScalarString1".into()),
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

}
use types::*;
pub mod types {
    pub type ScalarStringUuid1 = String;
    pub type ScalarString1 = String;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct PostPartial {
        pub id: Option<ScalarStringUuid1>,
        pub slug: Option<ScalarString1>,
        pub title: Option<ScalarString1>,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct ScalarStructShared2Partial {
        pub id: Option<ScalarString1>,
    }
    pub type ScalarStringEmail1 = String;
    pub type UserPostsPostList = Vec<PostPartial>;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct UserPartial {
        pub id: Option<ScalarStringUuid1>,
        pub email: Option<ScalarStringEmail1>,
        pub posts: Option<UserPostsPostList>,
    }
    pub type ScalarInteger1 = i64;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(untagged)]
    pub enum RootScalarUnionFnOutput {
        ScalarString1(ScalarString1),
        ScalarInteger1(ScalarInteger1),
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
        ScalarString1(ScalarString1),
        ScalarInteger1(ScalarInteger1),
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootNestedCompositeFnOutputCompositeStructNestedStructPartial {
        pub inner: Option<ScalarInteger1>,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootNestedCompositeFnOutputCompositeStructPartial {
        pub value: Option<ScalarInteger1>,
        pub nested: Option<RootNestedCompositeFnOutputCompositeStructNestedStructPartial>,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootNestedCompositeFnOutputListStructPartial {
        pub value: Option<ScalarInteger1>,
    }
    pub type RootNestedCompositeFnOutputListRootNestedCompositeFnOutputListStructList = Vec<RootNestedCompositeFnOutputListStructPartial>;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootNestedCompositeFnOutputPartial {
        pub scalar: Option<ScalarInteger1>,
        pub composite: Option<RootNestedCompositeFnOutputCompositeStructPartial>,
        pub list: Option<RootNestedCompositeFnOutputListRootNestedCompositeFnOutputListStructList>,
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

impl QueryGraph {

    pub fn new(addr: Url) -> Self {
        Self {
            addr,
            ty_to_gql_ty_map: std::sync::Arc::new([
            
                ("ScalarStringUuid1".into(), "String!".into()),
                ("ScalarString1".into(), "String!".into()),
                ("post".into(), "post!".into()),
                ("user".into(), "user!".into()),
        ].into()),
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
    ) -> QueryNode<ScalarString1>
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
        args: impl Into<NodeArgs<PostPartial>>
    ) -> MutationNode<ScalarString1>
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
    ) -> UnselectedNode<PostSelections, PostSelections<HasAlias>, MutationMarker, PostPartial>
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
        args: impl Into<NodeArgs<ScalarStructShared2Partial>>
    ) -> UnselectedNode<PostSelections, PostSelections<HasAlias>, MutationMarker, PostPartial>
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
        args: impl Into<NodeArgs<ScalarStructShared2Partial>>
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
        args: impl Into<NodeArgs<ScalarStructShared2Partial>>
    ) -> UnselectedNode<RootCompositeUnionFnOutputSelections, RootCompositeUnionFnOutputSelections<HasAlias>, QueryMarker, RootCompositeUnionFnOutput>
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
        args: impl Into<NodeArgs<ScalarStructShared2Partial>>
    ) -> UnselectedNode<RootMixedUnionFnOutputSelections, RootMixedUnionFnOutputSelections<HasAlias>, QueryMarker, RootMixedUnionFnOutput>
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
    ) -> UnselectedNode<RootNestedCompositeFnOutputSelections, RootNestedCompositeFnOutputSelections<HasAlias>, QueryMarker, RootNestedCompositeFnOutputPartial>
    {
        UnselectedNode {
            root_name: "nestedComposite".into(),
            root_meta: node_metas::RootNestedCompositeFn,
            args: NodeArgsErased::None,
            _marker: PhantomData,
        }
    }
}
