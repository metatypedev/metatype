use core::marker::PhantomData;
use metagen_client::prelude::*;

/// Contains constructors for the different transports supported
/// by the typegate. Namely:
/// - GraphQl transports ([sync](transports::graphql)/[async](transports::graphql_sync)): reqwest
///   based transports that talk to the typegate using GraphQl over HTTP.
/// - [Hostcall transport](transports::hostcall): used by custom functions running in the typegate to access typegraphs.
pub mod transports {
    use super::*;

    // metagen-genif-not HOSTCALL
    // metagen-skip
    // NOTE: reqwest wasm only works in js runtimes and not wasmtime
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
    // metagen-endif

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
