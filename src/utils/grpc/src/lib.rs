// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::{Context, Result};

use protobuf::{descriptor::MethodDescriptorProto, reflect::FieldDescriptor};

pub use protobuf::descriptor::field_descriptor_proto::Type;
pub use protobuf::reflect::FileDescriptor;

pub fn get_file_descriptor(content: &str) -> Result<FileDescriptor> {
    let parsed = proto_parser::model::FileDescriptor::parse(content)?;
    let file_descriptor_proto = proto_parser::convert::file_descriptor(&parsed)?;
    let file_descriptor = FileDescriptor::new_dynamic(file_descriptor_proto, &[])?;
    Ok(file_descriptor)
}

pub fn get_method_descriptor_proto(
    file_descriptor: FileDescriptor,
    relative_method_name: &str,
) -> Result<MethodDescriptorProto> {
    let method_name = get_relative_method_name(relative_method_name)?;
    let method = file_descriptor
        .proto()
        .service
        .iter()
        .flat_map(|service| &service.method)
        .find(|method| method.name.as_ref().is_some_and(|name| name == method_name))
        .context("method descriptor not found")?;
    Ok(method.clone())
}

fn get_relative_method_name(method_name: &str) -> Result<&str> {
    let path = method_name.split('/').collect::<Vec<&str>>();
    let method_name = path
        .last()
        .context("Failed to get name from absolute path")?;
    Ok(method_name.to_owned())
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
