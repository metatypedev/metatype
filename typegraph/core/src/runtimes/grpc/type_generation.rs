// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::{bail, Result};
use common::grpc::{
    get_file_descriptor, get_message_field_descriptor, get_method_descriptor_proto, Fields, Type,
};

use crate::{
    t::{self, TypeBuilder},
    types::TypeId,
};

pub struct TType {
    pub input: TypeId,
    pub output: TypeId,
}

pub fn generate_type(proto_file_content: &str, method_name: &str) -> Result<TType> {
    let file_descriptor = get_file_descriptor(proto_file_content)?;
    let method_descriptor = get_method_descriptor_proto(file_descriptor.clone(), method_name)?;

    let input_type = method_descriptor.input_type();
    let output_type = method_descriptor.output_type();

    let input_fields = get_message_field_descriptor(&file_descriptor, input_type)?;
    let output_fields = get_message_field_descriptor(&file_descriptor, output_type)?;

    Ok(TType {
        input: convert_proto_fields_to_type_id(input_fields)?,
        output: convert_proto_fields_to_type_id(output_fields)?,
    })
}

fn convert_proto_fields_to_type_id(fields: Fields) -> Result<TypeId> {
    let mut r#type = t::struct_();
    for field in fields {
        let field_name = field.name();
        let type_name = field.proto().type_();
        let type_id = match type_name {
            Type::TYPE_STRING => t::string().build()?,
            Type::TYPE_INT32 | Type::TYPE_INT64 => t::integer().build()?,
            Type::TYPE_FLOAT => t::float().build()?,
            Type::TYPE_BOOL => t::boolean().build()?,
            _ => bail!(
                "Unsupported field type '{:?}' for field '{}'",
                type_name,
                field_name
            ),
        };
        r#type.prop(field_name, type_id);
    }

    Ok(r#type.build()?)
}
