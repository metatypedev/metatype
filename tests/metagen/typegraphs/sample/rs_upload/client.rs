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
    pub fn RootUploadFn() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("file".into(), "RootUploadFnInputFileFile".into()),
                    ("path".into(), "RootUploadFnInputPathRootUploadFnInputPathStringOptional".into()),
                ].into()
            ),
            input_files: Some(PathToInputFiles(&[TypePath(&[TypePathSegment::ObjectProp("file")])])),
            ..scalar()
        }
    }
    pub fn RootUploadManyFn() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("prefix".into(), "RootUploadManyFnInputPrefixRootUploadFnInputPathStringOptional".into()),
                    ("files".into(), "RootUploadManyFnInputFilesRootUploadFnInputFileFileList".into()),
                ].into()
            ),
            input_files: Some(PathToInputFiles(&[TypePath(&[TypePathSegment::ObjectProp("files"), TypePathSegment::ArrayItem])])),
            ..scalar()
        }
    }

}
use types::*;
pub mod types {
    pub type RootUploadFnInputFileFile = super::FileId;
    pub type RootUploadFnInputPathString = String;
    pub type RootUploadFnInputPathRootUploadFnInputPathStringOptional = Option<RootUploadFnInputPathString>;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootUploadFnInputPartial {
        pub file: Option<RootUploadFnInputFileFile>,
        pub path: RootUploadFnInputPathRootUploadFnInputPathStringOptional,
    }
    pub type RootUploadManyFnInputPrefixRootUploadFnInputPathStringOptional = Option<RootUploadFnInputPathString>;
    pub type RootUploadManyFnInputFilesRootUploadFnInputFileFileList = Vec<RootUploadFnInputFileFile>;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RootUploadManyFnInputPartial {
        pub prefix: RootUploadManyFnInputPrefixRootUploadFnInputPathStringOptional,
        pub files: Option<RootUploadManyFnInputFilesRootUploadFnInputFileFileList>,
    }
    pub type RootUploadFnOutput = bool;
}

impl QueryGraph {

    pub fn new(addr: Url) -> Self {
        Self {
            addr,
            ty_to_gql_ty_map: std::sync::Arc::new([
            
                ("RootUploadFnInputFileFile".into(), "root_upload_fn_input_file_file!".into()),
                ("RootUploadFnInputPathRootUploadFnInputPathStringOptional".into(), "String".into()),
                ("RootUploadManyFnInputPrefixRootUploadFnInputPathStringOptional".into(), "String".into()),
                ("RootUploadManyFnInputFilesRootUploadFnInputFileFileList".into(), "[root_upload_fn_input_file_file]!".into()),
        ].into()),
        }
    }
    
    pub fn upload(
        &self,
        args: impl Into<NodeArgs<RootUploadFnInputPartial>>
    ) -> MutationNode<RootUploadFnOutput>
    {
        let nodes = selection_to_node_set(
            SelectionErasedMap(
                [(
                    "upload".into(),
                    SelectionErased::ScalarArgs(args.into().into()),
                )]
                .into(),
            ),
            &[
                ("upload".into(), node_metas::RootUploadFn as NodeMetaFn),
            ].into(),
            "$q".into(),
        )
        .unwrap();
        MutationNode(nodes.into_iter().next().unwrap(), PhantomData)
    }
    pub fn upload_many(
        &self,
        args: impl Into<NodeArgs<RootUploadManyFnInputPartial>>
    ) -> MutationNode<RootUploadFnOutput>
    {
        let nodes = selection_to_node_set(
            SelectionErasedMap(
                [(
                    "uploadMany".into(),
                    SelectionErased::ScalarArgs(args.into().into()),
                )]
                .into(),
            ),
            &[
                ("uploadMany".into(), node_metas::RootUploadManyFn as NodeMetaFn),
            ].into(),
            "$q".into(),
        )
        .unwrap();
        MutationNode(nodes.into_iter().next().unwrap(), PhantomData)
    }
}

