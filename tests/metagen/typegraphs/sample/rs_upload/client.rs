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

    pub fn graphql(qg: &QueryGraph, addr: Url) -> metagen_client::graphql::GraphQlTransportReqwest {
        metagen_client::graphql::GraphQlTransportReqwest::new(addr, qg.ty_to_gql_ty_map.clone())
    }

    #[cfg(not(target_family = "wasm"))]
    pub fn graphql_sync(
        qg: &QueryGraph,
        addr: Url,
    ) -> metagen_client::graphql::GraphQlTransportReqwestSync {
        metagen_client::graphql::GraphQlTransportReqwestSync::new(addr, qg.ty_to_gql_ty_map.clone())
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
    pub fn RootUploadManyFn() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    (
                        "files".into(),
                        "root_uploadMany_fn_input_files_file_bf9b7_list".into(),
                    ),
                    (
                        "prefix".into(),
                        "root_uploadMany_fn_input_prefix_string_25e51_optional".into(),
                    ),
                ]
                .into(),
            ),
            input_files: Some(PathToInputFiles(&[TypePath(&[
                TypePathSegment::ObjectProp("files"),
                TypePathSegment::ArrayItem,
            ])])),
            ..scalar()
        }
    }
    pub fn RootUploadFn() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("file".into(), "file_bf9b7".into()),
                    (
                        "path".into(),
                        "root_upload_fn_input_path_string_25e51_optional".into(),
                    ),
                ]
                .into(),
            ),
            input_files: Some(PathToInputFiles(&[TypePath(&[
                TypePathSegment::ObjectProp("file"),
            ])])),
            ..scalar()
        }
    }
}
use types::*;
#[allow(unused)]
pub mod types {
    // input types
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootUploadFnInput {
        pub file: FileBf9b7,
        pub path: RootUploadFnInputPathString25e51Optional,
    }
    pub type FileBf9b7 = super::FileId;
    pub type RootUploadFnInputPathString25e51Optional = Option<String>;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootUploadManyFnInput {
        pub prefix: RootUploadManyFnInputPrefixString25e51Optional,
        pub files: RootUploadManyFnInputFilesFileBf9b7List,
    }
    pub type RootUploadManyFnInputPrefixString25e51Optional = Option<String>;
    pub type RootUploadManyFnInputFilesFileBf9b7List = Vec<FileBf9b7>;
    // partial output types
    pub type RootUploadFnOutput = bool;
    // output types
}

pub fn query_graph() -> QueryGraph {
    QueryGraph {
        ty_to_gql_ty_map: std::sync::Arc::new(
            [
                ("file_bf9b7".into(), "file_bf9b7!".into()),
                (
                    "root_upload_fn_input_path_string_25e51_optional".into(),
                    "String".into(),
                ),
                (
                    "root_uploadMany_fn_input_prefix_string_25e51_optional".into(),
                    "String".into(),
                ),
                (
                    "root_uploadMany_fn_input_files_file_bf9b7_list".into(),
                    "[file_bf9b7!]!".into(),
                ),
            ]
            .into(),
        ),
    }
}
impl QueryGraph {
    pub fn upload(
        &self,
        args: impl Into<NodeArgs<RootUploadFnInput>>,
    ) -> MutationNode<RootUploadFnOutput> {
        let nodes = selection_to_node_set(
            SelectionErasedMap(
                [(
                    "upload".into(),
                    SelectionErased::ScalarArgs(args.into().into()),
                )]
                .into(),
            ),
            &[("upload".into(), node_metas::RootUploadFn as NodeMetaFn)].into(),
            "$q".into(),
        )
        .unwrap();
        MutationNode(nodes.into_iter().next().unwrap(), PhantomData)
    }
    pub fn upload_many(
        &self,
        args: impl Into<NodeArgs<RootUploadManyFnInput>>,
    ) -> MutationNode<RootUploadFnOutput> {
        let nodes = selection_to_node_set(
            SelectionErasedMap(
                [(
                    "uploadMany".into(),
                    SelectionErased::ScalarArgs(args.into().into()),
                )]
                .into(),
            ),
            &[(
                "uploadMany".into(),
                node_metas::RootUploadManyFn as NodeMetaFn,
            )]
            .into(),
            "$q".into(),
        )
        .unwrap();
        MutationNode(nodes.into_iter().next().unwrap(), PhantomData)
    }
}
