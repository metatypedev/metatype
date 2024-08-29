// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use anyhow::{Context, Result};

use std::path::Path;

use protobuf::{
    descriptor::{FileDescriptorProto, MethodDescriptorProto},
    reflect::{FieldDescriptor, FileDescriptor},
};

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
