// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::utils::*;
use crate::interlude::*;
use crate::mdk::types::*;
use common::typegraph::*;
use heck::ToPascalCase;
use std::fmt::Write;

pub struct RustTypeRenderer {
    pub derive_debug: bool,
    pub derive_serde: bool,
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
    fn render_name(&self, _renderer: &mut TypeRenderer, cursor: &VisitCursor) -> RenderedName {
        use RenderedName::*;
        let body_required = self.type_body_required(cursor.node.clone());
        match cursor.node.clone().deref() {
            // functions will be absent in our generated types
            TypeNode::Function { .. } => Name("()".to_string()),

            // under certain conditionds, we don't want to  generate aliases
            // for primitive types. this includes
            // - types with defualt generated names
            // - types with no special semantics
            TypeNode::Boolean { .. } if !body_required => Name("bool".to_string()),
            TypeNode::Integer { .. } if !body_required => Name("i64".to_string()),
            TypeNode::Float { .. } if !body_required => Name("f64".to_string()),
            TypeNode::String { .. } if !body_required => Name("String".to_string()),
            TypeNode::File { .. } if !body_required => Name("Vec<u8>".to_string()),
            TypeNode::Optional {
                // NOTE: keep this condition
                // in sync with similar one
                // below
                base,
                data:
                    OptionalTypeData {
                        default_value: None,
                        ..
                    },
            } if base.title.starts_with("optional_") => {
                // since the type name of Optionl<T> | Vec<T> depends on
                // the name of the inner type, we use placeholders at this ploint
                // as cycles are dealt with later
                Placeholder
            }
            TypeNode::List {
                // NOTE: keep this condition
                // in sync with similar one
                // below
                base,
                data:
                    ListTypeData {
                        min_items: None,
                        max_items: None,
                        ..
                    },
            } if base.title.starts_with("list_") => {
                // since the type name of Optionl<T> | Vec<T> depends on
                // the name of the inner type, we use placeholders at this point
                // as cycles are dealt with later
                Placeholder
            }
            ty => Name(normalize_type_title(&ty.base().title)),
            /*
             TypeNode::Union { base, .. } => {
                format!("{}Union", normalize_type_title(&base.title))
            }
            TypeNode::Either { base, .. } => {
                format!("{}Either", normalize_type_title(&base.title))
            }
            */
        }
    }

    fn render_body(
        &self,
        renderer: &mut TypeRenderer,
        ty_name: &str,
        cursor: &mut VisitCursor,
    ) -> anyhow::Result<()> {
        match cursor.node.clone().deref() {
            TypeNode::Function { .. } => {}
            TypeNode::Boolean { .. } => {
                self.render_alias(renderer, ty_name, "bool")?;
            }
            TypeNode::Float { .. } => {
                self.render_alias(renderer, ty_name, "f64")?;
            }
            TypeNode::Integer { .. } => {
                self.render_alias(renderer, ty_name, "i64")?;
            }
            TypeNode::String { .. } => {
                self.render_alias(renderer, ty_name, "String")?;
            }
            TypeNode::File { .. } => {
                self.render_alias(renderer, ty_name, "Vec<u8>")?;
            }
            TypeNode::Any { .. } => {
                self.render_alias(renderer, ty_name, "serde_json::Value")?;
            }
            TypeNode::Object { data, .. } => {
                let props = data
                    .properties
                    .iter()
                    // generate property type sfirst
                    .map(|(name, &dep_id)| {
                        let (ty_name, cyclic) = renderer.render_subgraph(dep_id, cursor)?;

                        let ty_name = if let Some(true) = cyclic {
                            format!("Box<{ty_name}>")
                        } else {
                            ty_name.to_string()
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
                self.render_struct(renderer, ty_name, props)?;
            }
            TypeNode::Union {
                data: UnionTypeData { any_of: variants },
                ..
            }
            | TypeNode::Either {
                data: EitherTypeData { one_of: variants },
                ..
            } => {
                let variants = variants
                    .iter()
                    .map(|&inner| {
                        let (ty_name, cyclic) = renderer.render_subgraph(inner, cursor)?;
                        let variant_name = ty_name.to_pascal_case();
                        let ty_name = if let Some(true) = cyclic {
                            format!("Box<{ty_name}>")
                        } else {
                            ty_name.to_string()
                        };
                        Ok::<_, anyhow::Error>((variant_name, ty_name))
                    })
                    .collect::<Result<Vec<_>, _>>()?;
                self.render_enum(renderer, ty_name, variants)?;
            }
            TypeNode::Optional {
                // NOTE: keep this condition
                // in sync with similar one above
                base,
                data:
                    OptionalTypeData {
                        default_value: None,
                        item,
                    },
            } if base.title.starts_with("optional_") => {
                // TODO: handle cyclic case where entire cycle is aliases
                let (inner_ty_name, cyclic) = renderer.render_subgraph(*item, cursor)?;
                let inner_ty_name = if let Some(true) = cyclic {
                    format!("Box<{inner_ty_name}>")
                } else {
                    inner_ty_name.to_string()
                };
                let true_ty_name = format!("Option<{inner_ty_name}>");
                let true_ty_name: Rc<str> = true_ty_name.into();
                let normalized_true_name = normalize_struct_prop_name(&true_ty_name);
                renderer.replace_placeholder_ty_name(
                    cursor.id,
                    true_ty_name,
                    vec![(normalize_struct_prop_name(ty_name), normalized_true_name)],
                );
            }
            TypeNode::Optional { data, .. } => {
                // TODO: handle cyclic case where entire cycle is aliases
                let (inner_ty_name, cyclic) = renderer.render_subgraph(data.item, cursor)?;
                let inner_ty_name = if let Some(true) = cyclic {
                    format!("Box<{inner_ty_name}>")
                } else {
                    inner_ty_name.to_string()
                };
                self.render_alias(renderer, ty_name, &format!("Option<{inner_ty_name}>"))?;
            }
            TypeNode::List {
                // NOTE: keep this condition
                // in sync with similar one above
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
                let true_ty_name = if let Some(true) = unique_items {
                    format!("std::collections::HashSet<{inner_ty_name}>")
                } else {
                    format!("Vec<{inner_ty_name}>")
                };
                let true_ty_name: Rc<str> = true_ty_name.into();
                let normalized_true_name = normalize_struct_prop_name(&true_ty_name);
                renderer.replace_placeholder_ty_name(
                    cursor.id,
                    true_ty_name,
                    vec![(normalize_struct_prop_name(ty_name), normalized_true_name)],
                );
            }
            TypeNode::List { data, .. } => {
                // TODO: handle cyclic case where entire cycle is aliases
                let (inner_ty_name, _) = renderer.render_subgraph(data.items, cursor)?;
                if let Some(true) = data.unique_items {
                    // let ty_name = format!("{inner_ty_name}Set");
                    self.render_alias(
                        renderer,
                        ty_name,
                        &format!("std::collections::HashSet<{inner_ty_name}>"),
                    )?;
                } else {
                    // let ty_name = format!("{inner_ty_name}List");
                    self.render_alias(renderer, ty_name, &format!("Vec<{inner_ty_name}>"))?;
                };
            }
        };
        Ok(())
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
                &nodes,
                Rc::new(RustTypeRenderer {
                    derive_serde: true,
                    derive_debug: true,
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
