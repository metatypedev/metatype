// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use std::{cell::RefCell, ops::Deref, path::PathBuf, rc::Rc, str::FromStr, sync::Arc};

use common::grpc::{
    create_client, get_file_descriptor, get_method_descriptor_proto, get_relative_message_name,
    get_relative_method_name, json2request, response_print_to_string, Client, DynCodec,
    PathAndQuery,
};

use dashmap::DashMap;
use deno_core::OpState;

use anyhow::{Context, Result};
use serde::Deserialize;

#[rustfmt::skip]
use deno_core as deno_core;

struct GrpcClient {
    client: Client,
    proto_file: String,
}

#[derive(Default)]
pub struct Ctx {
    grpc_clients: Arc<DashMap<String, GrpcClient>>,
}

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct GrpcRegisterInput {
    proto_file: String,
    endpoint: String,
    client_id: String,
}

#[deno_core::op2(async)]
pub async fn op_grpc_register(
    state: Rc<RefCell<OpState>>,
    #[serde] input: GrpcRegisterInput,
) -> Result<()> {
    let client = create_client(&input.endpoint).await?;

    let state = state.borrow();
    let ctx = state.borrow::<Ctx>();

    let grpc_client = GrpcClient {
        client,
        proto_file: input.proto_file,
    };
    ctx.grpc_clients
        .insert(input.client_id.clone(), grpc_client);

    Ok(())
}

#[deno_core::op2(fast)]
pub fn op_grpc_unregister(#[state] ctx: &mut Ctx, #[string] client_id: &str) -> Result<()> {
    ctx.grpc_clients
        .remove(client_id)
        .with_context(|| format!("Failed to remove gRPC client with ID: {}", client_id))?;

    Ok(())
}

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct GrpcCallMethodInput {
    method: String,
    payload: String,
    client_id: String,
}

#[deno_core::op2(async)]
#[string]
pub async fn op_call_grpc_method(
    state: Rc<RefCell<OpState>>,
    #[serde] input: GrpcCallMethodInput,
) -> Result<String> {
    let grpc_clients = {
        let state = state.borrow();
        let ctx = state.borrow::<Ctx>();
        ctx.grpc_clients.clone()
    };

    let mut grpc_client = grpc_clients
        .get_mut(&input.client_id)
        .with_context(|| format!("Could not find gRPC client '{}'", &input.client_id))?;

    let path = PathBuf::from_str(&grpc_client.proto_file)?;

    let file_descriptor = get_file_descriptor(&path)?;

    let method_name = get_relative_method_name(&input.method)?;

    let method_descriptor_proto =
        get_method_descriptor_proto(file_descriptor.clone(), &method_name)?;

    let request_message = get_relative_message_name(method_descriptor_proto.input_type())?;

    let req = json2request(input.payload, request_message, file_descriptor.clone())?;

    let path_query = PathAndQuery::from_str(input.method.as_str())?;

    grpc_client.client.ready().await?;

    let codec = DynCodec {
        method_descriptor_proto,
        file_descriptor,
    };

    let response = grpc_client
        .client
        .unary(req, path_query, codec)
        .await
        .context("Failed to perform unary gRPC call")?;

    let response = response.get_ref().deref();

    let json_response = response_print_to_string(response);

    Ok(json_response)
}
