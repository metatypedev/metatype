// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::{bail, Result};
use common::grpc::{
    get_file_descriptor, get_message_field_descriptor, get_method_descriptor_proto,
    get_relative_method_name, Fields,
};

use crate::{
    t::{self, TypeBuilder},
    types::TypeId,
};

pub struct Type {
    pub input: TypeId,
    pub output: TypeId,
}

pub fn generate_type(proto_file_content: &str, method_name: &str) -> Result<Type> {
    let file_descriptor = get_file_descriptor(proto_file_content)?;
    let method_descriptor = get_method_descriptor_proto(file_descriptor.clone(), method_name)?;

    let input_message = get_relative_method_name(&method_descriptor.input_type.unwrap())?;
    let out_message = get_relative_method_name(&method_descriptor.output_type.unwrap())?;

    let input_fields = get_message_field_descriptor(&file_descriptor, &input_message)?;
    let output_fields = get_message_field_descriptor(&file_descriptor, &out_message)?;

    Ok(Type {
        input: convert_proto_fields_to_type_id(input_fields)?,
        output: convert_proto_fields_to_type_id(output_fields)?,
    })
}

fn convert_proto_fields_to_type_id(fields: Fields) -> Result<TypeId> {
    let mut r#type = t::struct_();
    for field in fields {
        let field_name = field.name();
        let type_name = field.proto().type_name();
        let type_id = match type_name {
            "string" => t::string().build()?,
            "int32" => t::integer().build()?,
            "int64" => t::integer().build()?,
            "bool" => t::boolean().build()?,
            "float" => t::float().build()?,
            _ => bail!(
                "Unsupported field type '{}' for field '{}'",
                type_name,
                field_name
            ),
        };
        r#type.prop(field_name, type_id);
    }

    Ok(r#type.build()?)
}
