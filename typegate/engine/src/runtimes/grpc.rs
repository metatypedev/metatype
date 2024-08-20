// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use std::{
    ops::Deref,
    path::{Path, PathBuf},
    str::FromStr,
};

use protobuf::{
    descriptor::{FileDescriptorProto, MethodDescriptorProto},
    reflect::FileDescriptor,
    MessageDyn,
};

use anyhow::{Context, Result};
use bytes::{Buf, BufMut};
use serde::Deserialize;
use tonic::codegen::http::uri::PathAndQuery;
use tonic::{
    client::Grpc,
    codec::{Codec, DecodeBuf, Decoder, EncodeBuf, Encoder},
    transport::{Channel, Endpoint},
};
use tonic::{IntoRequest, Status};

#[rustfmt::skip]
use deno_core as deno_core;

type DynRequest = Box<dyn MessageDyn>;
type DynResponse = Box<dyn MessageDyn>;

#[derive(Clone)]
pub struct DynCodec {
    file_descriptor: FileDescriptor,
    method_descriptor_proto: MethodDescriptorProto,
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

fn json2request(
    json: String,
    input_message: String,
    file_descriptor: FileDescriptor,
) -> anyhow::Result<DynRequest> {
    let msg_descriptor = file_descriptor
        .message_by_package_relative_name(&input_message)
        .with_context(|| format!("Input message {input_message} not found"))?;
    let mut msg = msg_descriptor.new_instance();
    protobuf_json_mapping::merge_from_str(&mut *msg, &json)?;

    Ok(msg)
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

fn get_file_descriptor(proto_file: &Path) -> Result<FileDescriptor> {
    let proto_folder = proto_file
        .parent()
        .context("Proto file is not within a folder")?;

    let mut file_descriptors_protos = protobuf_parse::Parser::new()
        .include(proto_folder)
        .input(proto_file)
        .parse_and_typecheck()
        .unwrap()
        .file_descriptors;

    let file_descriptor_proto: FileDescriptorProto = file_descriptors_protos.pop().unwrap();

    let file_descriptor = FileDescriptor::new_dynamic(file_descriptor_proto, &[])?;

    Ok(file_descriptor)
}

fn get_method_descriptor_proto(
    file_descriptor: FileDescriptor,
    method_name: &str,
) -> Result<MethodDescriptorProto> {
    let method = file_descriptor
        .proto()
        .service
        .iter()
        .flat_map(|service| &service.method)
        .find(|method| method.name.as_ref().is_some_and(|name| name == method_name))
        .context("method descriptor not found")?;

    Ok(method.clone())
}

fn get_relative_method_name(absolute_method_name: &str) -> anyhow::Result<String> {
    let path: Vec<&str> = absolute_method_name.split('/').collect();
    let method = path.get(2).context("Invalid path")?;

    Ok(method.to_string())
}

fn get_relative_message_name(absolute_message_name: &str) -> anyhow::Result<String> {
    let path: Vec<&str> = absolute_message_name.split('.').collect();
    let message = path.get(2).context("Invalid path")?;

    Ok(message.to_string())
}

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct GrpcCallMethodInput {
    proto_file: String,
    method: String,
    payload: String,
    endpoint: String,
}

#[deno_core::op2(async)]
#[string]
pub async fn op_call_grpc_method(#[serde] input: GrpcCallMethodInput) -> Result<String> {
    let endpoint = Endpoint::from_str(&input.endpoint)?;
    let channel = Channel::builder(endpoint.uri().to_owned());
    let channel = channel.connect().await?;
    let mut client = Grpc::new(channel);

    let path = PathBuf::from_str(&input.proto_file).unwrap();
    let file_descriptor = get_file_descriptor(&path).unwrap();

    let method_name = get_relative_method_name(&input.method).unwrap();
    let method_descriptor_proto =
        get_method_descriptor_proto(file_descriptor.clone(), &method_name)?;

    let request_message = get_relative_message_name(method_descriptor_proto.input_type())?;
    let req = json2request(input.payload, request_message, file_descriptor.clone())?.into_request();

    let path_query = PathAndQuery::from_str(input.method.as_str()).unwrap();
    client.ready().await.unwrap();

    let codec = DynCodec {
        method_descriptor_proto,
        file_descriptor,
    };

    let response = client.unary(req, path_query, codec).await.unwrap();
    let response = response.get_ref().deref();
    let json_response = protobuf_json_mapping::print_to_string(response).unwrap();
    Ok(json_response)
}
