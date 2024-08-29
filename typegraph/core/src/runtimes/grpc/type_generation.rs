// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
use protobuf::descriptor::{FileDescriptorProto, MethodDescriptorProto};
use protobuf::reflect::MessageDescriptor;

struct TypeInfo {
    inp: Type,
    out: Type,
}

fn generate_type(
    proto_file: &FileDescriptorProto,
    method_name: &str,
) -> Result<TypeInfo, Box<dyn std::error::Error>> {
    // Find the service and method
    let method = find_method(proto_file, method_name)?;

    // Generate input type based on method arguments
    let input_type = generate(proto_file, &method.get_input_type())?;

    // Generate output type based on method return
    let output_type = generate(proto_file, &method.get_output_type())?;

    Ok(TypeInfo {
        inp: input_type,
        out: output_type,
    })
}

fn find_method(
    file: &FileDescriptorProto,
    method_name: &str,
) -> Result<&MethodDescriptorProto, Box<dyn std::error::Error>> {
    for service in file.get_service() {
        if let Some(method) = service
            .get_method()
            .iter()
            .find(|m| m.get_name() == method_name)
        {
            return Ok(method);
        }
    }
    Err("Method not found".into())
}

fn find_message(
    file: &FileDescriptorProto,
    type_name: &str,
) -> Result<&protobuf::descriptor::DescriptorProto, Box<dyn std::error::Error>> {
    for message in file.get_message_type() {
        if message.get_name() == type_name {
            return Ok(message);
        }
    }
    Err("Message type not found".into())
}
