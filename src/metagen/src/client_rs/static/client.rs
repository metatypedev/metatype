use core::marker::PhantomData;
use metagen_client::prelude::*;

pub mod transports {
    use super::*;

    pub fn graphql(qg: &QueryGraph, addr: Url) -> GraphQlTransportReqwest {
        GraphQlTransportReqwest::new(addr, qg.ty_to_gql_ty_map.clone())
    }
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
