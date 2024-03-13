// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use super::utils::normalize_type_title;
use crate::interlude::*;
use crate::utils::*;
use crate::*;
use heck::ToPascalCase;
use std::fmt::Write;

pub struct GenTypesOptions {
    pub derive_debug: bool,
    pub derive_serde: bool,
}
/// Writes the rust description of the type in the destinition file
/// and returns the name of the type.
pub fn gen_types(
    desc: &TypeDesc,
    dest: &mut GenDestBuf,
    memo: &mut HashMap<u32, Arc<str>>,
    opts: &GenTypesOptions,
) -> anyhow::Result<Arc<str>> {
    let id = match desc {
        TypeDesc::Default { id, .. }
        | TypeDesc::Optional { id, .. }
        | TypeDesc::List { id, .. }
        | TypeDesc::Either { id, .. }
        | TypeDesc::Union { id, .. }
        | TypeDesc::Function { id, .. }
        | TypeDesc::Object { id, .. } => *id,
    };
    if let Some(name) = memo.get(&id) {
        return Ok(name.clone());
    };
    fn write_derive(dest: &mut GenDestBuf, opts: &GenTypesOptions) -> anyhow::Result<()> {
        let mut derive_args = vec![];
        if opts.derive_debug {
            derive_args.extend_from_slice(&["Debug"]);
        }
        if opts.derive_serde {
            derive_args.extend_from_slice(&["serde::Serialize", "serde::Deserialize"]);
        }
        if !derive_args.is_empty() {
            dest.buf.write_fmt(format_args!(
                "#[derive({})]\n",
                derive_args
                    .iter()
                    .try_fold(String::new(), |mut acc, cur| {
                        write!(&mut acc, "{cur}, ")?;
                        Ok::<_, std::fmt::Error>(acc)
                    })?
                    .strip_suffix(", ")
                    .unwrap()
            ))?;
        }
        Ok(())
    }
    let ty_name = match desc {
        TypeDesc::Optional { item: inner, .. } => {
            let ty_name = gen_types(inner, dest, memo, opts)?;
            let optional_ty_name: Arc<str> = format!("{ty_name}Maybe").into();
            dest.buf.write_fmt(format_args!(
                "pub type {optional_ty_name} = Option<{ty_name}>;\n"
            ))?;
            optional_ty_name
        }
        TypeDesc::Default { node, .. } if matches!(node, TypeNode::Boolean { .. }) => {
            let ty_name: Arc<str> = normalize_type_title(&node.base().title).into();
            dest.buf
                .write_fmt(format_args!("pub type {ty_name} = bool;\n"))?;
            ty_name
        }
        TypeDesc::Default { node, .. } if matches!(node, TypeNode::Float { .. }) => {
            let ty_name: Arc<str> = normalize_type_title(&node.base().title).into();
            dest.buf
                .write_fmt(format_args!("pub type {ty_name} = f64;\n"))?;
            ty_name
        }
        TypeDesc::Default { node, .. } if matches!(node, TypeNode::Integer { .. }) => {
            let ty_name: Arc<str> = normalize_type_title(&node.base().title).into();
            dest.buf
                .write_fmt(format_args!("pub type {ty_name} = i64;\n"))?;
            ty_name
        }
        TypeDesc::Default { node, .. } if matches!(node, TypeNode::String { .. }) => {
            let ty_name: Arc<str> = normalize_type_title(&node.base().title).into();
            dest.buf
                .write_fmt(format_args!("pub type {ty_name} = String;\n"))?;
            ty_name
        }
        TypeDesc::Default { node, .. } if matches!(node, TypeNode::File { .. }) => {
            let ty_name: Arc<str> = normalize_type_title(&node.base().title).into();
            dest.buf
                .write_fmt(format_args!("pub type {ty_name} = Vec<u8>;\n"))?;
            ty_name
        }
        TypeDesc::Object { props, node, .. } => {
            let props = props
                .iter()
                .map(|(name, (ty, required))| {
                    let ty_name = gen_types(ty, dest, memo, opts)?;
                    let ty_name = if *required {
                        ty_name.to_string()
                    } else {
                        format!("Option<{ty_name}>")
                    };
                    Ok::<_, anyhow::Error>((name, ty_name))
                })
                .collect::<Result<IndexMap<_, _>, _>>()?
                .into_iter()
                .try_fold(String::new(), |mut out, (name, ty_name)| {
                    writeln!(&mut out, "    pub {name}: {ty_name},")?;
                    Ok::<_, std::fmt::Error>(out)
                })?;
            let ty_name: Arc<str> = normalize_type_title(&node.base().title).into();
            write_derive(dest, opts)?;
            dest.buf.write_fmt(format_args!(
                r#"pub struct {ty_name} {{
{props}
}}
"#,
                props = props.strip_suffix('\n').unwrap()
            ))?;
            ty_name
        }
        TypeDesc::List { items, is_set, .. } => {
            let ty_name = gen_types(items, dest, memo, opts)?;
            if *is_set {
                let set_ty_name: Arc<str> = format!("{ty_name}Set").into();
                dest.buf.write_fmt(format_args!(
                    "pub type {set_ty_name} = std::collections::HashSet<{ty_name}>;\n"
                ))?;
                set_ty_name
            } else {
                let list_ty_name: Arc<str> = format!("{ty_name}List").into();
                dest.buf
                    .write_fmt(format_args!("pub type {list_ty_name} = Vec<{ty_name}>;\n"))?;
                list_ty_name
            }
        }
        TypeDesc::Either { node, one_of, .. }
        | TypeDesc::Union {
            node,
            any_of: one_of,
            ..
        } => {
            let variants = one_of
                .iter()
                .map(|inner| gen_types(inner, dest, memo, opts))
                .collect::<Result<Vec<_>, _>>()?
                .into_iter()
                .try_fold(String::new(), |mut out, ty_name| {
                    writeln!(&mut out, "    {}({ty_name}),", ty_name.to_pascal_case())?;
                    Ok::<_, std::fmt::Error>(out)
                })?;

            let ty_name: Arc<str> = if matches!(desc, TypeDesc::Either { .. }) {
                format!("{}Either", normalize_type_title(&node.base().title))
            } else {
                format!("{}Union", normalize_type_title(&node.base().title))
            }
            .to_pascal_case()
            .into();
            write_derive(dest, opts)?;
            dest.buf.write_fmt(format_args!(
                r#"pub enum {ty_name} {{
{variants}
}}
"#,
                variants = variants.strip_suffix('\n').unwrap()
            ))?;
            ty_name
        }
        TypeDesc::Default { node, .. } if matches!(node, TypeNode::Any { .. }) => {
            let ty_name: Arc<str> = normalize_type_title(&node.base().title).into();
            dest.buf
                .write_fmt(format_args!("type {ty_name} = serde_json::Value;\n"))?;
            ty_name
        }
        TypeDesc::Function { .. } => Arc::from("()"),
        desc => {
            anyhow::bail!("unsupported type: {desc:?}")
        }
    };
    memo.insert(id, ty_name.clone());
    Ok(ty_name)
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::mdk_rust::*;
    use common::typegraph::*;

    fn default_type_node_base() -> TypeNodeBase {
        TypeNodeBase {
            title: String::new(),
            as_id: false,
            config: Default::default(),
            runtime: 0,
            policies: vec![],
            injection: None,
            description: None,
            enumeration: None,
        }
    }

    #[test]
    fn ty_generation_test() -> anyhow::Result<()> {
        let cases = [(
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
                        title: "random_name".into(),
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
                        title: "random_name".into(),
                        ..default_type_node_base()
                    },
                },
                TypeNode::Optional {
                    data: OptionalTypeData {
                        item: 0,
                        default_value: None,
                    },
                    base: TypeNodeBase {
                        title: "random_name".into(),
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
                            ("my_string".to_string(), 0),
                            ("list".to_string(), 1),
                            ("optional".to_string(), 0),
                            ("optional_optional".to_string(), 3),
                        ]
                        .into_iter()
                        .collect(),
                        required: ["my_string", "list"].into_iter().map(Into::into).collect(),
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
                        title: "my_enum".into(),
                        ..default_type_node_base()
                    },
                },
                TypeNode::Union {
                    data: UnionTypeData {
                        any_of: vec![0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                    },
                    base: TypeNodeBase {
                        title: "my_enum".into(),
                        ..default_type_node_base()
                    },
                },
            ],
            "MyEnumUnion",
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
    pub my_string: MyStr,
    pub list: MyStrList,
    pub optional: Option<MyStr>,
    pub optional_optional: Option<MyStrMaybe>,
}
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub enum MyEnumEither {
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
pub enum MyEnumUnion {
    MyStr(MyStr),
    MyStrList(MyStrList),
    MyStrSet(MyStrSet),
    MyStrMaybe(MyStrMaybe),
    MyInt(MyInt),
    MyFloat(MyFloat),
    MyBool(MyBool),
    MyFile(MyFile),
    MyObj(MyObj),
    MyEnumEither(MyEnumEither),
}
"#,
        )];
        for (nodes, name, out) in cases {
            let descs = crate::nodes_to_desc(&nodes)?;
            let desc = descs.get(&(nodes.len() as u32 - 1)).unwrap();

            let mut dest = GenDestBuf { buf: String::new() };
            let gen_name = gen_types(
                desc,
                &mut dest,
                &mut HashMap::new(),
                &GenTypesOptions {
                    derive_serde: true,
                    derive_debug: true,
                },
            )?;

            assert_eq!(&gen_name[..], name, "generated unexpected type name");
            assert_eq!(
                dest.buf.as_str(),
                out,
                "output buffer was not equal for {name}\n{}{}",
                dest.buf.as_str(),
                out,
            );
        }
        Ok(())
    }
}
