// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use std::{cell::RefCell, ops::Deref, rc::Rc, str::FromStr, sync::Arc};

use common::grpc::{get_file_descriptor, get_method_descriptor_proto, get_relative_message_name};

use anyhow::{Context, Result};
use bytes::{Buf, BufMut};
use dashmap::DashMap;
use protobuf::{descriptor::MethodDescriptorProto, reflect::FileDescriptor, MessageDyn};

use deno_core::OpState;
use serde::Deserialize;
#[rustfmt::skip]
use deno_core as deno_core;

use tonic::codegen::http::uri::PathAndQuery;
use tonic::{
    client::Grpc,
    codec::{Codec, DecodeBuf, Decoder, EncodeBuf, Encoder},
    transport::{Channel, Endpoint},
    IntoRequest, Request, Status,
};

type DynRequest = Box<dyn MessageDyn>;
type DynResponse = Box<dyn MessageDyn>;

#[derive(Clone)]
pub struct DynCodec {
    pub file_descriptor: FileDescriptor,
    pub method_descriptor_proto: MethodDescriptorProto,
}

impl Codec for DynCodec {
    type Encode = DynRequest;
    type Decode = DynResponse;

    type Encoder = DynCodec;
    type Decoder = DynCodec;

    fn encoder(&mut self) -> Self::Encoder {
        self.clone()
    }

    fn decoder(&mut self) -> Self::Decoder {
        self.clone()
    }
}

impl Encoder for DynCodec {
    type Item = DynRequest;

    type Error = Status;

    fn encode(
        &mut self,
        item: Self::Item,
        dst: &mut EncodeBuf<'_>,
    ) -> std::prelude::v1::Result<(), Self::Error> {
        item.write_to_bytes_dyn()
            .map(|buf| dst.put(buf.as_slice()))
            .map_err(|err| Status::internal(format!("{:?}", err)))
    }
}

impl Decoder for DynCodec {
    type Item = DynResponse;
    type Error = Status;

    fn decode(&mut self, src: &mut DecodeBuf<'_>) -> Result<Option<Self::Item>, Self::Error> {
        let buf = src.chunk();
        let length = buf.len();

        let response_message =
            get_relative_message_name(self.method_descriptor_proto.output_type()).unwrap();

        let response = buf2response(buf, response_message, self.file_descriptor.clone())
            .map(Some)
            .map_err(|err| Status::internal(format!("{:?}", err)));
        src.advance(length);
        response
    }
}

async fn create_client(endpoint: &str) -> Result<Grpc<Channel>> {
    let endpoint = Endpoint::from_str(endpoint).context("Failed to parse endpoint")?;

    let channel = Channel::builder(endpoint.uri().to_owned())
        .connect()
        .await
        .context("Failed to connect to endpoint")?;

    Ok(Grpc::new(channel))
}

pub fn json2request(
    json: String,
    input_message: String,
    file_descriptor: FileDescriptor,
) -> anyhow::Result<Request<DynRequest>> {
    let msg_descriptor = file_descriptor
        .message_by_package_relative_name(&input_message)
        .with_context(|| format!("Input message {input_message} not found"))?;
    let mut msg = msg_descriptor.new_instance();
    protobuf_json_mapping::merge_from_str(&mut *msg, &json)?;

    Ok(msg.into_request())
}

fn buf2response(
    buffer: &[u8],
    output_message: String,
    file_descriptor: FileDescriptor,
) -> anyhow::Result<DynResponse> {
    let msg_descriptor = file_descriptor
        .message_by_package_relative_name(&output_message)
        .with_context(|| format!("Output message {output_message} not found"))?;

    let mut msg = msg_descriptor.new_instance();
    msg.merge_from_bytes_dyn(buffer)?;

    Ok(msg)
}

struct GrpcClient {
    client: Grpc<Channel>,
    proto_file_content: String,
}

#[derive(Default)]
pub struct Ctx {
    grpc_clients: Arc<DashMap<String, GrpcClient>>,
}

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct GrpcRegisterInput {
    proto_file_content: String,
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
        proto_file_content: input.proto_file_content,
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

    let file_descriptor = get_file_descriptor(&grpc_client.proto_file_content)?;

    let method_descriptor_proto =
        get_method_descriptor_proto(file_descriptor.clone(), &input.method)?;

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

    let json_response = protobuf_json_mapping::print_to_string(response).unwrap();

    Ok(json_response)
}
