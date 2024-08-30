// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

pub mod proto_parser;

use anyhow::{Context, Result};

use protobuf::{
    descriptor::MethodDescriptorProto,
    reflect::{FieldDescriptor, FileDescriptor},
};

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
