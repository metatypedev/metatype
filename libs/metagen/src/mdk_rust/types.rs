// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::utils::*;
use crate::interlude::*;
use crate::shared::types::*;
use common::typegraph::*;
use heck::ToPascalCase;
use std::fmt::Write;

pub struct RustTypeRenderer {
    pub derive_debug: bool,
    pub derive_serde: bool,
    // this is used by the client since
    // users might exclude fields on return
    // types
    pub all_fields_optional: bool,
}

impl RustTypeRenderer {
    fn render_derive(&self, dest: &mut impl Write) -> std::fmt::Result {
        let mut derive_args = vec![];
        if self.derive_debug {
            derive_args.extend_from_slice(&["Debug"]);
        }
        if self.derive_serde {
            derive_args.extend_from_slice(&["serde::Serialize", "serde::Deserialize"]);
        }
        if !derive_args.is_empty() {
            write!(dest, "#[derive(")?;
            let last = derive_args.pop().unwrap();
            for arg in derive_args {
                write!(dest, "{arg}, ")?;
            }
            write!(dest, "{last}")?;
            writeln!(dest, ")]")?;
        }
        Ok(())
    }

    fn render_alias(
        &self,
        out: &mut impl Write,
        alias_name: &str,
        aliased_ty: &str,
    ) -> std::fmt::Result {
        writeln!(out, "pub type {alias_name} = {aliased_ty};")
    }

    /// `props` is a map of prop_name -> (TypeName, serialization_name)
    fn render_struct(
        &self,
        dest: &mut impl Write,
        ty_name: &str,
        props: IndexMap<String, (String, Option<String>)>,
    ) -> std::fmt::Result {
        self.render_derive(dest)?;
        writeln!(dest, "pub struct {ty_name} {{")?;
        for (name, (ty_name, ser_name)) in props.into_iter() {
            if let Some(ser_name) = ser_name {
                writeln!(dest, r#"    #[serde(rename = "{ser_name}")]"#)?;
            }
            writeln!(dest, "    pub {name}: {ty_name},")?;
        }
        writeln!(dest, "}}")?;
        Ok(())
    }

    /// `variants` is variant name to variant type
    /// All generated variants are tuples of arity 1.
    fn render_enum(
        &self,
        dest: &mut impl Write,
        ty_name: &str,
        variants: Vec<(String, String)>,
    ) -> std::fmt::Result {
        self.render_derive(dest)?;
        writeln!(dest, "#[serde(untagged)]")?;
        writeln!(dest, "pub enum {ty_name} {{")?;
        for (var_name, ty_name) in variants.into_iter() {
            writeln!(dest, "    {var_name}({ty_name}),")?;
        }
        writeln!(dest, "}}")?;
        Ok(())
    }
}
impl RenderType for RustTypeRenderer {
    fn render(
        &self,
        renderer: &mut TypeRenderer,
        cursor: &mut VisitCursor,
    ) -> anyhow::Result<String> {
        let body_required = type_body_required(cursor.node.clone());
        let name = match cursor.node.clone().deref() {
            TypeNode::Function { .. } => "()".into(),

            // if [type_body_required] says so, we usually need to generate
            // aliases for even simple primitie types
            TypeNode::Boolean { base, .. } if body_required => {
                let ty_name = normalize_type_title(&base.title);
                self.render_alias(renderer, &ty_name, "bool")?;
                ty_name
            }
            // under certain conditionds, we don't want to  generate aliases
            // for primitive types. this includes
            // - types with defualt generated names
            // - types with no special semantics
            TypeNode::Boolean { .. } => "bool".into(),

            TypeNode::Float { base, .. } if body_required => {
                let ty_name = normalize_type_title(&base.title);
                self.render_alias(renderer, &ty_name, "f64")?;
                ty_name
            }
            TypeNode::Float { .. } => "f64".into(),

            TypeNode::Integer { base, .. } if body_required => {
                let ty_name = normalize_type_title(&base.title);
                self.render_alias(renderer, &ty_name, "i64")?;
                ty_name
            }
            TypeNode::Integer { .. } => "i64".into(),

            TypeNode::String {
                data:
                    StringTypeData {
                        format: Some(format),
                        pattern: None,
                        min_length: None,
                        max_length: None,
                    },
                base:
                    TypeNodeBase {
                        title,
                        enumeration: None,
                        ..
                    },
            } if title.starts_with("string_") => {
                let ty_name = normalize_type_title(&format!("string_{format}_{}", cursor.id));
                self.render_alias(renderer, &ty_name, "String")?;
                ty_name
            }
            TypeNode::String { base, .. } if body_required => {
                let ty_name = normalize_type_title(&base.title);
                self.render_alias(renderer, &ty_name, "String")?;
                ty_name
            }
            TypeNode::String { .. } => "String".into(),

            TypeNode::File { base, .. } if body_required => {
                let ty_name = normalize_type_title(&base.title);
                self.render_alias(renderer, &ty_name, "Vec<u8>")?;
                ty_name
            }
            TypeNode::File { .. } => "Vec<u8>".into(),

            TypeNode::Any { base, .. } if body_required => {
                let ty_name = normalize_type_title(&base.title);
                self.render_alias(renderer, &ty_name, "serde_json::Value")?;
                ty_name
            }
            TypeNode::Any { .. } => "serde_json::Value".into(),

            TypeNode::Object { data, base } => {
                let props = data
                    .properties
                    .iter()
                    // generate property type sfirst
                    .map(|(name, &dep_id)| {
                        let (ty_name, cyclic) = renderer.render_subgraph(dep_id, cursor)?;

                        let ty_name = match ty_name {
                            RenderedName::Name(name) => name,
                            RenderedName::Placeholder(name) => name,
                        };

                        let ty_name = match renderer.nodes[dep_id as usize].deref() {
                            TypeNode::Optional { .. } => ty_name.to_string(),
                            _ if !self.all_fields_optional => ty_name.to_string(),
                            _ => format!("Option<{ty_name}>"),
                        };

                        let ty_name = if let Some(true) = cyclic {
                            format!("Box<{ty_name}>")
                        } else {
                            ty_name
                        };

                        let normalized_prop_name = normalize_struct_prop_name(name);
                        let rename_name = if normalized_prop_name.as_str() != name.as_str() {
                            Some(name.clone())
                        } else {
                            None
                        };
                        Ok::<_, anyhow::Error>((normalized_prop_name, (ty_name, rename_name)))
                    })
                    .collect::<Result<IndexMap<_, _>, _>>()?;

                let ty_name = normalize_type_title(&base.title);
                let ty_name = if self.all_fields_optional {
                    format!("{ty_name}Partial")
                } else {
                    ty_name
                };
                self.render_struct(renderer, &ty_name, props)?;
                ty_name
            }
            TypeNode::Union {
                data: UnionTypeData { any_of: variants },
                base,
            }
            | TypeNode::Either {
                data: EitherTypeData { one_of: variants },
                base,
            } => {
                let variants = variants
                    .iter()
                    .map(|&inner| {
                        let (ty_name, cyclic) = renderer.render_subgraph(inner, cursor)?;
                        let (variant_name, ty_name) = match ty_name {
                            RenderedName::Name(name) => (name.to_pascal_case(), name),
                            RenderedName::Placeholder(name) => (
                                renderer
                                    .placeholder_string(
                                        inner,
                                        Box::new(|final_name| final_name.to_pascal_case()),
                                    )
                                    .to_string(),
                                name,
                            ),
                        };
                        let ty_name = if let Some(true) = cyclic {
                            format!("Box<{ty_name}>")
                        } else {
                            ty_name.to_string()
                        };
                        Ok::<_, anyhow::Error>((variant_name, ty_name))
                    })
                    .collect::<Result<Vec<_>, _>>()?;
                let ty_name = normalize_type_title(&base.title);
                self.render_enum(renderer, &ty_name, variants)?;
                ty_name
            }
            // Simple optionals don't require aliases
            TypeNode::Optional {
                base,
                data:
                    OptionalTypeData {
                        default_value: None,
                        item,
                    },
            } if base.title.starts_with("optional_") => {
                // TODO: handle cyclic case where entire cycle is aliases
                let (inner_ty_name, cyclic) = renderer.render_subgraph(*item, cursor)?;
                let inner_ty_name = match inner_ty_name {
                    RenderedName::Name(name) => name,
                    RenderedName::Placeholder(name) => name,
                };
                let inner_ty_name = if let Some(true) = cyclic {
                    format!("Box<{inner_ty_name}>")
                } else {
                    inner_ty_name.to_string()
                };
                format!("Option<{inner_ty_name}>")
            }
            TypeNode::Optional { data, base } => {
                // TODO: handle cyclic case where entire cycle is aliases
                let (inner_ty_name, cyclic) = renderer.render_subgraph(data.item, cursor)?;
                let inner_ty_name = match inner_ty_name {
                    RenderedName::Name(name) => name,
                    RenderedName::Placeholder(name) => name,
                };
                let inner_ty_name = if let Some(true) = cyclic {
                    format!("Box<{inner_ty_name}>")
                } else {
                    inner_ty_name.to_string()
                };
                let ty_name = normalize_type_title(&base.title);
                self.render_alias(renderer, &ty_name, &format!("Option<{inner_ty_name}>"))?;
                ty_name
            }
            // simple list types don't require aliases
            TypeNode::List {
                base,
                data:
                    ListTypeData {
                        min_items: None,
                        max_items: None,
                        unique_items,
                        items,
                    },
            } if base.title.starts_with("list_") => {
                // TODO: handle cyclic case where entire cycle is aliases
                let (inner_ty_name, _) = renderer.render_subgraph(*items, cursor)?;
                let inner_ty_name = match inner_ty_name {
                    RenderedName::Name(name) => name,
                    RenderedName::Placeholder(name) => name,
                };
                if let Some(true) = unique_items {
                    format!("std::collections::HashSet<{inner_ty_name}>")
                } else {
                    format!("Vec<{inner_ty_name}>")
                }
            }
            TypeNode::List { data, base } => {
                // TODO: handle cyclic case where entire cycle is aliases
                let (inner_ty_name, _) = renderer.render_subgraph(data.items, cursor)?;
                let inner_ty_name = match inner_ty_name {
                    RenderedName::Name(name) => name,
                    RenderedName::Placeholder(name) => name,
                };
                let ty_name = normalize_type_title(&base.title);
                if let Some(true) = data.unique_items {
                    // let ty_name = format!("{inner_ty_name}Set");
                    self.render_alias(
                        renderer,
                        &ty_name,
                        &format!("std::collections::HashSet<{inner_ty_name}>"),
                    )?;
                } else {
                    // let ty_name = format!("{inner_ty_name}List");
                    self.render_alias(renderer, &ty_name, &format!("Vec<{inner_ty_name}>"))?;
                };
                ty_name
            }
        };
        Ok(name)
    }
}

#[cfg(test)]
mod test {
    use crate::tests::default_type_node_base;

    use super::*;

    #[test]
    fn ty_generation_test() -> anyhow::Result<()> {
        let cases = [
            (
                "kitchen_sink",
                vec![
                    TypeNode::String {
                        data: StringTypeData {
                            format: None,
                            pattern: None,
                            min_length: None,
                            max_length: None,
                        },
                        base: TypeNodeBase {
                            title: "my_str".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::List {
                        data: ListTypeData {
                            items: 0,
                            max_items: None,
                            min_items: None,
                            unique_items: None,
                        },
                        base: TypeNodeBase {
                            title: "my_str_list".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::List {
                        data: ListTypeData {
                            items: 0,
                            max_items: None,
                            min_items: None,
                            unique_items: Some(true),
                        },
                        base: TypeNodeBase {
                            title: "my_str_set".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Optional {
                        data: OptionalTypeData {
                            item: 0,
                            default_value: None,
                        },
                        base: TypeNodeBase {
                            title: "my_str_maybe".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Integer {
                        data: IntegerTypeData {
                            maximum: None,
                            multiple_of: None,
                            exclusive_minimum: None,
                            exclusive_maximum: None,
                            minimum: None,
                        },
                        base: TypeNodeBase {
                            title: "my_int".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Float {
                        data: FloatTypeData {
                            maximum: None,
                            multiple_of: None,
                            exclusive_minimum: None,
                            exclusive_maximum: None,
                            minimum: None,
                        },
                        base: TypeNodeBase {
                            title: "my_float".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Boolean {
                        base: TypeNodeBase {
                            title: "my_bool".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::File {
                        data: FileTypeData {
                            min_size: None,
                            max_size: None,
                            mime_types: None,
                        },
                        base: TypeNodeBase {
                            title: "my_file".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Object {
                        data: ObjectTypeData {
                            properties: [
                                ("myString".to_string(), 0),
                                ("list".to_string(), 1),
                                ("optional".to_string(), 3),
                            ]
                            .into_iter()
                            .collect(),
                            // FIXME: remove required
                            required: vec![],
                        },
                        base: TypeNodeBase {
                            title: "my_obj".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Either {
                        data: EitherTypeData {
                            one_of: vec![0, 1, 2, 3, 4, 5, 6, 7, 8],
                        },
                        base: TypeNodeBase {
                            title: "my_either".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Union {
                        data: UnionTypeData {
                            any_of: vec![0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                        },
                        base: TypeNodeBase {
                            title: "my_union".into(),
                            ..default_type_node_base()
                        },
                    },
                ],
                "MyUnion",
                r#"pub type MyStr = String;
pub type MyStrList = Vec<MyStr>;
pub type MyStrSet = std::collections::HashSet<MyStr>;
pub type MyStrMaybe = Option<MyStr>;
pub type MyInt = i64;
pub type MyFloat = f64;
pub type MyBool = bool;
pub type MyFile = Vec<u8>;
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct MyObj {
    #[serde(rename = "myString")]
    pub my_string: MyStr,
    pub list: MyStrList,
    pub optional: MyStrMaybe,
}
#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum MyEither {
    MyStr(MyStr),
    MyStrList(MyStrList),
    MyStrSet(MyStrSet),
    MyStrMaybe(MyStrMaybe),
    MyInt(MyInt),
    MyFloat(MyFloat),
    MyBool(MyBool),
    MyFile(MyFile),
    MyObj(MyObj),
}
#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum MyUnion {
    MyStr(MyStr),
    MyStrList(MyStrList),
    MyStrSet(MyStrSet),
    MyStrMaybe(MyStrMaybe),
    MyInt(MyInt),
    MyFloat(MyFloat),
    MyBool(MyBool),
    MyFile(MyFile),
    MyObj(MyObj),
    MyEither(MyEither),
}
"#,
            ),
            (
                "alias_avoidance",
                vec![
                    TypeNode::String {
                        data: StringTypeData {
                            format: None,
                            pattern: None,
                            min_length: None,
                            max_length: None,
                        },
                        base: TypeNodeBase {
                            title: "string_0".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::List {
                        data: ListTypeData {
                            items: 0,
                            max_items: None,
                            min_items: None,
                            unique_items: None,
                        },
                        base: TypeNodeBase {
                            title: "list_1".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::List {
                        data: ListTypeData {
                            items: 0,
                            max_items: None,
                            min_items: None,
                            unique_items: Some(true),
                        },
                        base: TypeNodeBase {
                            title: "list_2".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Optional {
                        data: OptionalTypeData {
                            item: 0,
                            default_value: None,
                        },
                        base: TypeNodeBase {
                            title: "optional_3".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Integer {
                        data: IntegerTypeData {
                            maximum: None,
                            multiple_of: None,
                            exclusive_minimum: None,
                            exclusive_maximum: None,
                            minimum: None,
                        },
                        base: TypeNodeBase {
                            title: "integer_4".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Float {
                        data: FloatTypeData {
                            maximum: None,
                            multiple_of: None,
                            exclusive_minimum: None,
                            exclusive_maximum: None,
                            minimum: None,
                        },
                        base: TypeNodeBase {
                            title: "float_5".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Boolean {
                        base: TypeNodeBase {
                            title: "boolean_6".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::File {
                        data: FileTypeData {
                            min_size: None,
                            max_size: None,
                            mime_types: None,
                        },
                        base: TypeNodeBase {
                            title: "file_7".into(),
                            ..default_type_node_base()
                        },
                    },
                ],
                "Vec<u8>",
                r#""#,
            ),
            (
                "cycles_obj",
                vec![
                    TypeNode::Object {
                        data: ObjectTypeData {
                            properties: [("obj_b".to_string(), 1)].into_iter().collect(),
                            required: ["obj_b"].into_iter().map(Into::into).collect(),
                        },
                        base: TypeNodeBase {
                            title: "ObjA".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Object {
                        data: ObjectTypeData {
                            properties: [("obj_c".to_string(), 2)].into_iter().collect(),
                            required: ["obj_c"].into_iter().map(Into::into).collect(),
                        },
                        base: TypeNodeBase {
                            title: "ObjB".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Object {
                        data: ObjectTypeData {
                            properties: [("obj_a".to_string(), 0)].into_iter().collect(),
                            required: ["obj_a"].into_iter().map(Into::into).collect(),
                        },
                        base: TypeNodeBase {
                            title: "ObjC".into(),
                            ..default_type_node_base()
                        },
                    },
                ],
                "ObjC",
                r#"#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ObjB {
    pub obj_c: ObjC,
}
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ObjA {
    pub obj_b: ObjB,
}
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ObjC {
    pub obj_a: Box<ObjA>,
}
"#,
            ),
            (
                "cycles_union",
                vec![
                    TypeNode::Object {
                        data: ObjectTypeData {
                            properties: [("obj_b".to_string(), 1)].into_iter().collect(),
                            required: ["obj_b"].into_iter().map(Into::into).collect(),
                        },
                        base: TypeNodeBase {
                            title: "ObjA".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Object {
                        data: ObjectTypeData {
                            properties: [("union_c".to_string(), 2)].into_iter().collect(),
                            required: ["union_c"].into_iter().map(Into::into).collect(),
                        },
                        base: TypeNodeBase {
                            title: "ObjB".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Union {
                        data: UnionTypeData { any_of: vec![0] },
                        base: TypeNodeBase {
                            title: "CUnion".into(),
                            ..default_type_node_base()
                        },
                    },
                ],
                "CUnion",
                r#"#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ObjB {
    pub union_c: CUnion,
}
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ObjA {
    pub obj_b: ObjB,
}
#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum CUnion {
    ObjA(Box<ObjA>),
}
"#,
            ),
            (
                "cycles_either",
                vec![
                    TypeNode::Object {
                        data: ObjectTypeData {
                            properties: [("obj_b".to_string(), 1)].into_iter().collect(),
                            required: ["obj_b"].into_iter().map(Into::into).collect(),
                        },
                        base: TypeNodeBase {
                            title: "ObjA".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Object {
                        data: ObjectTypeData {
                            properties: [("either_c".to_string(), 2)].into_iter().collect(),
                            required: ["either_c"].into_iter().map(Into::into).collect(),
                        },
                        base: TypeNodeBase {
                            title: "ObjB".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Either {
                        data: EitherTypeData { one_of: vec![0] },
                        base: TypeNodeBase {
                            title: "CEither".into(),
                            ..default_type_node_base()
                        },
                    },
                ],
                "CEither",
                r#"#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ObjB {
    pub either_c: CEither,
}
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ObjA {
    pub obj_b: ObjB,
}
#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum CEither {
    ObjA(Box<ObjA>),
}
"#,
            ),
        ];
        for (test_name, nodes, name, test_out) in cases {
            let mut renderer = TypeRenderer::new(
                nodes.iter().cloned().map(Rc::new).collect::<Vec<_>>(),
                Rc::new(RustTypeRenderer {
                    derive_serde: true,
                    derive_debug: true,
                    all_fields_optional: false,
                }),
            );
            let gen_name = renderer.render(nodes.len() as u32 - 1)?;
            let (real_out, _) = renderer.finalize();

            pretty_assertions::assert_eq!(
                &gen_name[..],
                name,
                "{test_name}: generated unexpected type name"
            );
            pretty_assertions::assert_eq!(
                real_out,
                test_out,
                "{test_name}: output buffer was not equal for {name}",
            );
        }
        Ok(())
    }
}
