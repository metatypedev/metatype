use core::marker::PhantomData;
use metagen_client::prelude::*;

pub mod transports {
    use super::*;

    pub fn graphql(qg: &QueryGraph, addr: Url) -> GraphQlTransportReqwest {
        GraphQlTransportReqwest::new(addr, qg.ty_to_gql_ty_map.clone())
    }
    #[cfg(not(target_family = "wasm"))]
    pub fn graphql_sync(qg: &QueryGraph, addr: Url) -> GraphQlTransportReqwestSync {
        GraphQlTransportReqwestSync::new(addr, qg.ty_to_gql_ty_map.clone())
    }
    // metagen-genif HOSTCALL
    // metagen-skip
    // NOTE: make sure changes here matches the stub in fdk.rs

    pub fn hostcall(qg: &QueryGraph) -> metagen_client::hostcall::HostcallTransport {
        metagen_client::hostcall::HostcallTransport::new(
            std::sync::Arc::new(super::hostcall),
            qg.ty_to_gql_ty_map.clone(),
        )
    }
    // metagen-endif
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
