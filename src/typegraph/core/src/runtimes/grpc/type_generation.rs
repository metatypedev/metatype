// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::{bail, Result};
use common::grpc::{
    get_file_descriptor, get_message_field_descriptor, get_method_descriptor_proto, Fields,
    FileDescriptor, Type,
};
use std::collections::HashMap;

use crate::{
    t::{self, TypeBuilder},
    types::TypeId,
};

pub struct GeneratedType {
    pub input: TypeId,
    pub output: TypeId,
}

type Cache = HashMap<String, TypeId>;

pub fn generate_type(proto_file_content: &str, method_name: &str) -> Result<GeneratedType> {
    let file_descriptor = get_file_descriptor(proto_file_content)?;
    let method_descriptor = get_method_descriptor_proto(file_descriptor.clone(), method_name)?;

    let input_type = method_descriptor.input_type();
    let output_type = method_descriptor.output_type();

    let mut cache = HashMap::new();

    let input_fields = get_message_field_descriptor(&file_descriptor, input_type)?;
    let output_fields = get_message_field_descriptor(&file_descriptor, output_type)?;

    Ok(GeneratedType {
        input: convert_proto_fields_to_type_id(&file_descriptor, input_fields, &mut cache)?,
        output: convert_proto_fields_to_type_id(&file_descriptor, output_fields, &mut cache)?,
    })
}

fn convert_proto_fields_to_type_id(
    file_descriptor: &FileDescriptor,
    fields: Fields,
    cache: &mut Cache,
) -> Result<TypeId> {
    let mut r#type = t::struct_();

    for field in fields {
        let field_name = field.name().to_string();
        let type_name = field.proto().type_name();

        let cache_key = format!("{}/{}", type_name, field_name);

        // Check if the type is already cached
        if let Some(cached_type_id) = cache.get(&cache_key) {
            r#type.prop(&field_name, *cached_type_id);
            continue;
        }

        let mut type_id = match field.proto().type_() {
            Type::TYPE_STRING => t::string().build()?,
            Type::TYPE_INT32 | Type::TYPE_INT64 => t::integer().build()?,
            Type::TYPE_FLOAT => t::float().build()?,
            Type::TYPE_BOOL => t::boolean().build()?,
            Type::TYPE_MESSAGE => {
                let nested_message_type = field.proto().type_name();
                let nested_fields =
                    get_message_field_descriptor(file_descriptor, nested_message_type)?;
                convert_proto_fields_to_type_id(file_descriptor, nested_fields, cache)?
            }
            _ => bail!(
                "Unsupported field type '{:?}' for field '{}'",
                field.proto().type_(),
                field_name
            ),
        };

        if field.is_repeated() {
            type_id = t::list(type_id).build()?;
        }

        if !field.is_required() {
            type_id = t::optional(type_id).build()?;
        }

        // Cache the type_id using the unique cache key
        cache.insert(cache_key, type_id);

        r#type.prop(&field_name, type_id);
    }

    Ok(r#type.build()?)
}
