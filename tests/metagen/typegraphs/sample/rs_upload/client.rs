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
use types::*;
pub mod types {
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
    pub type RootUploadFnOutput = bool;
}

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
                    ("file".into(), "FileBf9b7()".into()),
                    ("path".into(), "RootUploadFnInputPathString25e51Optional()".into()),
                ].into()
            ),
            ..RootUploadFnOutput()()
        }
    }
    pub fn RootUploadManyFn() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("prefix".into(), "RootUploadManyFnInputPrefixString25e51Optional()".into()),
                    ("files".into(), "RootUploadManyFnInputFilesFileBf9b7List()".into()),
                ].into()
            ),
            ..RootUploadFnOutput()()
        }
    }

}

impl QueryGraph {

    pub fn new(addr: Url) -> Self {
        Self {
            addr,
            ty_to_gql_ty_map: std::sync::Arc::new([
            
        ].into()),
        }
    }
    
}

