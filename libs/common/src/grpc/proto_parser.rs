// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::{anyhow, Result};
use protobuf::{
    descriptor::{
        field_descriptor_proto::Type, DescriptorProto, EnumDescriptorProto,
        EnumValueDescriptorProto, FieldDescriptorProto, FileDescriptorProto,
    },
    reflect::FileDescriptor,
};

pub struct ProtoParser;

impl ProtoParser {
    pub fn parse(content: &str) -> Result<FileDescriptorProto> {
        let mut file_descriptor = FileDescriptorProto::new();
        let mut current_message: Option<DescriptorProto> = None;
        let mut current_enum: Option<EnumDescriptorProto> = None;

        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with("//") {
                continue;
            }

            if line.starts_with("syntax") {
                Self::parse_syntax(&mut file_descriptor, line)?;
            } else if line.starts_with("package") {
                Self::parse_package(&mut file_descriptor, line)?;
            } else if line.starts_with("message") {
                if let Some(message) = current_message.take() {
                    file_descriptor.message_type.push(message);
                }
                current_message = Some(Self::parse_message_start(line)?);
            } else if line.starts_with("enum") {
                if let Some(enum_type) = current_enum.take() {
                    file_descriptor.enum_type.push(enum_type);
                }
                current_enum = Some(Self::parse_enum_start(line)?);
            } else if line.ends_with('}') {
                if let Some(message) = current_message.take() {
                    file_descriptor.message_type.push(message);
                }
                if let Some(enum_type) = current_enum.take() {
                    file_descriptor.enum_type.push(enum_type);
                }
            } else if let Some(ref mut message) = current_message {
                Self::parse_message_field(message, line)?;
            } else if let Some(ref mut enum_type) = current_enum {
                Self::parse_enum_value(enum_type, line)?;
            }
        }

        if let Some(message) = current_message.take() {
            file_descriptor.message_type.push(message);
        }
        if let Some(enum_type) = current_enum.take() {
            file_descriptor.enum_type.push(enum_type);
        }

        Ok(file_descriptor)
    }

    fn parse_syntax(file_descriptor: &mut FileDescriptorProto, line: &str) -> Result<()> {
        let syntax = line
            .split('=')
            .nth(1)
            .ok_or_else(|| anyhow!("Invalid syntax line"))?
            .trim()
            .trim_matches('"');
        file_descriptor.set_syntax(syntax.to_string());
        Ok(())
    }

    fn parse_package(file_descriptor: &mut FileDescriptorProto, line: &str) -> Result<()> {
        let package = line
            .split_whitespace()
            .nth(1)
            .ok_or_else(|| anyhow!("Invalid package line"))?
            .trim_matches(';');
        file_descriptor.set_package(package.to_string());
        Ok(())
    }

    fn parse_message_start(line: &str) -> Result<DescriptorProto> {
        let name = line
            .split_whitespace()
            .nth(1)
            .ok_or_else(|| anyhow!("Invalid message line"))?
            .trim_matches('{');
        let mut message = DescriptorProto::new();
        message.set_name(name.to_string());
        Ok(message)
    }

    fn parse_message_field(message: &mut DescriptorProto, line: &str) -> Result<()> {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 4 {
            return Err(anyhow!("Invalid field line"));
        }

        let mut field = FieldDescriptorProto::new();
        field.set_name(parts[1].to_string());
        field.set_number(parts[3].trim_matches(';').parse()?);

        let field_type = match parts[0] {
            "double" => Type::TYPE_DOUBLE,
            "float" => Type::TYPE_FLOAT,
            "int64" => Type::TYPE_INT64,
            "uint64" => Type::TYPE_UINT64,
            "int32" => Type::TYPE_INT32,
            "fixed64" => Type::TYPE_FIXED64,
            "fixed32" => Type::TYPE_FIXED32,
            "bool" => Type::TYPE_BOOL,
            "string" => Type::TYPE_STRING,
            "group" => Type::TYPE_GROUP,
            "message" => Type::TYPE_MESSAGE,
            "bytes" => Type::TYPE_BYTES,
            "uint32" => Type::TYPE_UINT32,
            "enum" => Type::TYPE_ENUM,
            "sfixed32" => Type::TYPE_SFIXED32,
            "sfixed64" => Type::TYPE_SFIXED64,
            "sint32" => Type::TYPE_SINT32,
            "sint64" => Type::TYPE_SINT64,
            _ => return Err(anyhow!("Unsupported field type: {}", parts[0])),
        };
        field.set_type(field_type);

        message.field.push(field);
        Ok(())
    }

    fn parse_enum_start(line: &str) -> Result<EnumDescriptorProto> {
        let name = line
            .split_whitespace()
            .nth(1)
            .ok_or_else(|| anyhow!("Invalid enum line"))?
            .trim_matches('{');
        let mut enum_type = EnumDescriptorProto::new();
        enum_type.set_name(name.to_string());
        Ok(enum_type)
    }

    fn parse_enum_value(enum_type: &mut EnumDescriptorProto, line: &str) -> Result<()> {
        let parts: Vec<&str> = line.split('=').collect();
        if parts.len() != 2 {
            return Err(anyhow!("Invalid enum value line"));
        }

        let name = parts[0].trim().to_string();
        let number: i32 = parts[1].trim().trim_matches(';').parse()?;

        let mut enum_value = EnumValueDescriptorProto::new();
        enum_value.set_name(name);
        enum_value.set_number(number);

        enum_type.value.push(enum_value);
        Ok(())
    }
}

pub fn get_file_descriptor(content: &str) -> Result<FileDescriptor> {
    let file_descriptor_proto = ProtoParser::parse(content)?;
    let file_descriptor = FileDescriptor::new_dynamic(file_descriptor_proto, &[])?;
    Ok(file_descriptor)
}
