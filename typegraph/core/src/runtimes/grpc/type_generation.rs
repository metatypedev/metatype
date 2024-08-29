// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::Path;

use anyhow::Result;
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

pub fn generate_type(proto_file: &str, method_name: &str) -> Result<Type> {
    let proto_path = Path::new(proto_file);
    let file_descriptor = get_file_descriptor(proto_path)?;

    let method_descriptor = get_method_descriptor_proto(file_descriptor.clone(), method_name)?;

    let input_message = get_relative_method_name(&method_descriptor.input_type.unwrap())?;

    let out_message = get_relative_method_name(&method_descriptor.output_type.unwrap())?;

    let input_fields = get_message_field_descriptor(&file_descriptor, &input_message)?;
    let output_fields = get_message_field_descriptor(&file_descriptor, &out_message)?;

    Ok(Type {
        input: traduct(input_fields)?,
        output: traduct(output_fields)?,
    })
}

fn traduct(fields: Fields) -> Result<TypeId> {
    let mut r#type = t::struct_();
    for field in fields {
        let the_type = match field.proto().type_name() {
            "string" => t::string().build()?,
            "int32" => t::integer().build()?,
            "int64" => t::integer().build()?,
            "bool" => t::boolean().build()?,
            "float" => t::float().build()?,
            tt => panic!("{tt} is not type"),
        };
        r#type.prop(field.name(), the_type);
    }

    Ok(r#type.build()?)
}
