// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use crate::RT;
use macros::deno;

use std::path::{Path, PathBuf};
use std::str::FromStr;

use protobuf::descriptor::{FileDescriptorProto, MethodDescriptorProto};
use protobuf::reflect::FileDescriptor;
use protobuf::MessageDyn;

use bytes::{Buf, BufMut};
use tonic::client::Grpc;
use tonic::codec::{Codec, DecodeBuf, Decoder, EncodeBuf, Encoder};
use tonic::codegen::http::uri::PathAndQuery;
use tonic::transport::{Channel, Endpoint};
use tonic::{IntoRequest, Status};

#[deno]
struct GrpcInput {
    proto_file: String,
    method: String,
    payload: String,
}

#[deno]
enum GrpcOutput {
    Ok { res: String },
    Err { message: String },
}

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
    fn encode(&mut self, item: Self::Item, dst: &mut EncodeBuf<'_>) -> Result<(), Self::Error> {
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
            get_relative_message_name(self.method_descriptor_proto.input_type()).unwrap();

        let ret = buf2response(buf, response_message, self.file_descriptor.clone())
            .map(Some)
            .map_err(|err| Status::internal(format!("{:?}", err)));
        src.advance(length);
        ret
    }
}

fn json2request(
    json: String,
    name: String,
    file_descriptor: FileDescriptor,
) -> anyhow::Result<DynRequest> {
    let msg_descriptor = file_descriptor
        .message_by_package_relative_name(&name)
        .unwrap();
    let mut msg = msg_descriptor.new_instance();
    protobuf_json_mapping::merge_from_str(&mut *msg, &json)?;

    Ok(msg)
}

fn buf2response(
    buffer: &[u8],
    name: String,
    file_descriptor: FileDescriptor,
) -> anyhow::Result<DynResponse> {
    let msg_descriptor = file_descriptor
        .message_by_package_relative_name(&name)
        .unwrap();

    let mut msg = msg_descriptor.new_instance();
    msg.merge_from_bytes_dyn(buffer)?;

    Ok(msg)
}

fn get_file_descriptor(proto_file: &Path) -> anyhow::Result<FileDescriptor> {
    let mut file_descriptor_protos = protobuf_parse::Parser::new()
        .protoc()
        .includes(["proto"])
        .input(proto_file)
        .parse_and_typecheck()
        .unwrap()
        .file_descriptors;

    let file_descriptor_proto: FileDescriptorProto = file_descriptor_protos.pop().unwrap();

    let file_descriptor = FileDescriptor::new_dynamic(file_descriptor_proto, &[])?;

    Ok(file_descriptor)
}

fn get_method_descriptor_proto(
    file_descriptor: FileDescriptor,
    method_name: &str,
) -> anyhow::Result<MethodDescriptorProto> {
    let mut method_descriptor_proto = None;

    file_descriptor.proto().service.iter().for_each(|service| {
        service.method.iter().for_each(|method| {
            if method.name == Some(method_name.to_string()) {
                method_descriptor_proto = Some(method);
            }
        })
    });

    Ok(method_descriptor_proto.unwrap().clone())
}

fn get_relative_message_name(absolute_message_name: &str) -> anyhow::Result<String> {
    let relative_message_name = absolute_message_name.split('.').collect::<Vec<_>>()[2];

    Ok(relative_message_name.to_string())
}

fn get_relative_method_name(absolute_method_name: &str) -> anyhow::Result<String> {
    let method_path_vec: Vec<&str> = absolute_method_name.split('/').collect();
    let method_name = method_path_vec[2];

    Ok(method_name.to_string())
}

fn get_gprc_client(endpoint: String) -> anyhow::Result<Grpc<Channel>> {
    let endpoint = Endpoint::from_str(endpoint.as_str()).unwrap();

    let channel = Channel::builder(endpoint.uri().to_owned());
    let channel = RT.block_on(channel.connect()).unwrap();

    let client = Grpc::new(channel);

    Ok(client)
}

type JsonResponse = String;
type JsonRequest = String;
type MethodPath = String;

fn call_method(
    endpoint: String,
    proto_file: &Path,
    method_path: MethodPath,
    json_payload: JsonRequest,
) -> JsonResponse {
    let mut client = get_gprc_client(endpoint).unwrap();

    let file_descriptor = get_file_descriptor(proto_file).unwrap();

    let method_name = get_relative_method_name(&method_path).unwrap();
    let method_descriptor_proto =
        get_method_descriptor_proto(file_descriptor.clone(), &method_name).unwrap();

    let request_message = get_relative_message_name(method_descriptor_proto.input_type()).unwrap();
    let req = json2request(json_payload, request_message, file_descriptor.clone())
        .unwrap()
        .into_request();

    let path = PathAndQuery::from_str(method_path.as_str()).unwrap();

    RT.block_on(client.ready()).unwrap();

    let codec = DynCodec {
        method_descriptor_proto,
        file_descriptor,
    };

    let response = RT.block_on(client.unary(req, path, codec));
    let response = response.unwrap().get_ref().to_string();
    response
}

#[deno]
fn call_grpc_method(input: GrpcInput) -> GrpcOutput {
    let endpoint = String::from("http://localhost:4770");
    let proto_file = PathBuf::from_str(&input.proto_file).unwrap();

    let response = call_method(endpoint, &proto_file, input.method, input.payload);
    GrpcOutput::Ok { res: response }
}
