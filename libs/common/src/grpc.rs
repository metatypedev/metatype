// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use anyhow::{Context, Result};
use bytes::{Buf, BufMut};
use tonic::{
    client::Grpc,
    codec::{Codec, DecodeBuf, Decoder, EncodeBuf, Encoder},
    transport::{Channel, Endpoint},
    IntoRequest, Request, Status,
};

pub use tonic::codegen::http::uri::PathAndQuery;

use std::{path::Path, str::FromStr};

pub type Client = Grpc<Channel>;

use protobuf::{
    descriptor::{FileDescriptorProto, MethodDescriptorProto},
    reflect::{FieldDescriptor, FileDescriptor},
    MessageDyn,
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

pub async fn create_client(endpoint: &str) -> Result<Client> {
    let endpoint = Endpoint::from_str(endpoint).context("Failed to parse endpoint")?;

    let channel = Channel::builder(endpoint.uri().to_owned())
        .connect()
        .await
        .context("Failed to connect to endpoint")?;

    Ok(Grpc::new(channel))
}

pub fn get_file_descriptor(proto_file: &Path) -> Result<FileDescriptor> {
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

pub fn get_method_descriptor_proto(
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

pub fn get_relative_method_name(absolute_method_name: &str) -> anyhow::Result<String> {
    let path: Vec<&str> = absolute_method_name.split('/').collect();
    let method = path.get(2).context("Invalid path")?;

    Ok(method.to_string())
}

pub fn get_relative_message_name(absolute_message_name: &str) -> anyhow::Result<String> {
    let path: Vec<&str> = absolute_message_name.split('.').collect();
    let message = path.get(2).context("Invalid path")?;

    Ok(message.to_string())
}

pub fn response_print_to_string(response: &dyn MessageDyn) -> String {
    protobuf_json_mapping::print_to_string(response).unwrap()
}

pub type Fields = Vec<FieldDescriptor>;

pub fn get_message_field_descriptor(
    file_descriptor: &FileDescriptor,
    type_name: &str,
) -> Result<Fields> {
    let message_descriptor = file_descriptor
        .message_by_full_name(type_name)
        .context(format!("Message not found: {}", type_name))?;

    Ok(message_descriptor.fields().collect())
}
