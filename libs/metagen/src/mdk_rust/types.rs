// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::utils::*;
use crate::interlude::*;
use crate::utils::*;
use common::typegraph::FileTypeData;
use common::typegraph::FloatTypeData;
use common::typegraph::ListTypeData;
use common::typegraph::OptionalTypeData;
use common::typegraph::StringTypeData;
use heck::ToPascalCase;
use std::fmt::Write;

pub struct GenTypesOptions {
    pub derive_debug: bool,
    pub derive_serde: bool,
}

type VisitedTypePath = HashMap<u32, Vec<Vec<u32>>>;

/// Writes the rust description of the type in the destinition buf
/// and returns the name of the type + set of id path of of all visited types.
pub fn gen_type(
    id: u32,
    nodes: &[TypeNode],
    dest: &mut GenDestBuf,
    memo: &mut HashMap<u32, Arc<str>>,
    opts: &GenTypesOptions,
    parent_path: &[u32],
) -> anyhow::Result<(Arc<str>, VisitedTypePath)> {
    let node = &nodes[id as usize];
    let my_path: Vec<_> = parent_path
        .iter()
        .copied()
        .chain(std::iter::once(id))
        .collect();
    let mut visited_types = [(id, vec![my_path.clone()])].into_iter().collect();

    // short circuit if we've already generated the type
    if let Some(name) = memo.get(&id) {
        return Ok((name.clone(), visited_types));
    };

    // generate the type name up first
    let (gen_code, ty_name) = match node {
        // functions will be absent in our gnerated types
        TypeNode::Function { .. } => (false, "()".to_string()),

        // under certain conditionds, we don't want to  generate aliases
        // for primitive types. this includes
        // - types with defualt generated names
        // - types with no special semantics
        TypeNode::Boolean { base } if base.title.starts_with("boolean_") => {
            (false, "bool".to_string())
        }
        TypeNode::Integer {
            base,
            data:
                common::typegraph::IntegerTypeData {
                    minimum: None,
                    maximum: None,
                    multiple_of: None,
                    exclusive_minimum: None,
                    exclusive_maximum: None,
                },
        } if base.title.starts_with("integer_") => (false, "i64".to_string()),
        TypeNode::Float {
            base,
            data:
                FloatTypeData {
                    minimum: None,
                    maximum: None,
                    multiple_of: None,
                    exclusive_minimum: None,
                    exclusive_maximum: None,
                },
        } if base.title.starts_with("float_") => (false, "f64".to_string()),
        TypeNode::String {
            base,
            data:
                StringTypeData {
                    min_length: None,
                    max_length: None,
                    format: None,
                    pattern: None,
                },
        } if base.title.starts_with("string_") => (false, "String".to_string()),
        TypeNode::File {
            base,
            data:
                FileTypeData {
                    min_size: None,
                    max_size: None,
                    mime_types: None,
                },
        } if base.title.starts_with("file_") => (false, "Vec<u8>".to_string()),
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
            (true, normalize_type_title(&format!("&&placeholder{id}%%")))
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
            // the name of the inner type, we use placeholders at this ploint
            (true, normalize_type_title(&format!("&&placeholder{id}%%")))
        }
        ty => (true, normalize_type_title(&ty.base().title)),
        /*
         TypeNode::Union { base, .. } => {
            format!("{}Union", normalize_type_title(&base.title))
        }
        TypeNode::Either { base, .. } => {
            format!("{}Either", normalize_type_title(&base.title))
        }
        */
    };
    let mut ty_name: Arc<str> = ty_name.into();

    // insert typename into memo before generation to allow cyclic resolution
    // if this function is recursively called when generating dependent branches
    memo.insert(id, ty_name.clone());

    if gen_code {
        match node {
            TypeNode::Function { .. } => unreachable!(),
            TypeNode::Boolean { .. } => {
                gen_alias(&mut dest.buf, &ty_name, "bool")?;
            }
            TypeNode::Float { .. } => {
                gen_alias(&mut dest.buf, &ty_name, "f64")?;
            }
            TypeNode::Integer { .. } => {
                gen_alias(&mut dest.buf, &ty_name, "i64")?;
            }
            TypeNode::String { .. } => {
                gen_alias(&mut dest.buf, &ty_name, "String")?;
            }
            TypeNode::File { .. } => {
                gen_alias(&mut dest.buf, &ty_name, "Vec<u8>")?;
            }
            TypeNode::Any { .. } => {
                gen_alias(&mut dest.buf, &ty_name, "serde_json::Value")?;
            }
            TypeNode::Object { data, .. } => {
                let props = data
                    .properties
                    .iter()
                    // generate property type sfirst
                    .map(|(name, &dep_id)| {
                        let (ty_name, branch_visited_types) =
                            gen_type(dep_id, nodes, dest, memo, opts, &my_path)?;

                        /* let ty_name = if data.required.contains(name) {
                            ty_name.to_string()
                        } else {
                            format!("Option<{ty_name}>")
                        }; */

                        let ty_name = if let Some(true) =
                            is_path_unsized_cyclic(id, &my_path, &branch_visited_types, nodes)
                        {
                            format!("Box<{ty_name}>")
                        } else {
                            ty_name.to_string()
                        };
                        merge_visited_paths_into(branch_visited_types, &mut visited_types);

                        let normalized_prop_name = normalize_struct_prop_name(name);
                        let rename_name = if normalized_prop_name.as_str() != name.as_str() {
                            Some(name.clone())
                        } else {
                            None
                        };
                        Ok::<_, anyhow::Error>((normalized_prop_name, (ty_name, rename_name)))
                    })
                    .collect::<Result<IndexMap<_, _>, _>>()?;
                gen_struct(&mut dest.buf, opts, &ty_name[..], props)?;
            }
            TypeNode::Union { data, .. } => {
                let variants = data
                    .any_of
                    .iter()
                    .map(|&inner| {
                        let (ty_name, branch_visited_types) =
                            gen_type(inner, nodes, dest, memo, opts, &my_path)?;
                        let variant_name = ty_name.to_pascal_case();
                        let ty_name = if let Some(true) =
                            is_path_unsized_cyclic(id, &my_path, &branch_visited_types, nodes)
                        {
                            format!("Box<{ty_name}>")
                        } else {
                            ty_name.to_string()
                        };
                        merge_visited_paths_into(branch_visited_types, &mut visited_types);
                        Ok::<_, anyhow::Error>((variant_name, ty_name))
                    })
                    .collect::<Result<Vec<_>, _>>()?;
                gen_enum(&mut dest.buf, opts, &ty_name, variants)?;
            }
            TypeNode::Either { data, .. } => {
                let variants = data
                    .one_of
                    .iter()
                    .map(|&inner| {
                        let (ty_name, branch_visited_types) =
                            gen_type(inner, nodes, dest, memo, opts, &my_path)?;
                        let variant_name = ty_name.to_pascal_case();
                        let ty_name = if let Some(true) =
                            is_path_unsized_cyclic(id, &my_path, &branch_visited_types, nodes)
                        {
                            format!("Box<{ty_name}>")
                        } else {
                            ty_name.to_string()
                        };
                        merge_visited_paths_into(branch_visited_types, &mut visited_types);
                        Ok::<_, anyhow::Error>((variant_name, ty_name))
                    })
                    .collect::<Result<Vec<_>, _>>()?;
                gen_enum(&mut dest.buf, opts, &ty_name, variants)?;
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
                let (inner_ty_name, inner_visited_types) =
                    gen_type(*item, nodes, dest, memo, opts, &my_path)?;
                let inner_ty_name = if let Some(true) =
                    is_path_unsized_cyclic(id, &my_path, &inner_visited_types, nodes)
                {
                    format!("Box<{inner_ty_name}>")
                } else {
                    inner_ty_name.to_string()
                };
                merge_visited_paths_into(inner_visited_types, &mut visited_types);
                let true_ty_name = format!("Option<{inner_ty_name}>");
                let true_ty_name: Arc<str> = true_ty_name.into();
                dest.buf = replace_placeholder_ty_name(&dest.buf, &ty_name, &true_ty_name);
                memo.insert(id, true_ty_name.clone());
                ty_name = true_ty_name;
            }
            TypeNode::Optional { data, .. } => {
                // TODO: handle cyclic case where entire cycle is aliases
                let (inner_ty_name, inner_visited_types) =
                    gen_type(data.item, nodes, dest, memo, opts, &my_path)?;
                // let optional_ty_name: Arc<str> = format!("{inner_ty_name}Maybe").into();
                let inner_ty_name = if let Some(true) =
                    is_path_unsized_cyclic(id, &my_path, &inner_visited_types, nodes)
                {
                    format!("Box<{inner_ty_name}>")
                } else {
                    inner_ty_name.to_string()
                };
                merge_visited_paths_into(inner_visited_types, &mut visited_types);
                gen_alias(&mut dest.buf, &ty_name, &format!("Option<{inner_ty_name}>"))?;
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
                let (inner_ty_name, inner_visited_types) =
                    gen_type(*items, nodes, dest, memo, opts, &my_path)?;
                merge_visited_paths_into(inner_visited_types, &mut visited_types);
                let true_ty_name = if let Some(true) = unique_items {
                    format!("std::collections::HashSet<{inner_ty_name}>")
                } else {
                    format!("Vec<{inner_ty_name}>")
                };
                let true_ty_name: Arc<str> = true_ty_name.into();
                dest.buf = replace_placeholder_ty_name(&dest.buf, &ty_name, &true_ty_name);
                memo.insert(id, true_ty_name.clone());
                ty_name = true_ty_name;
            }
            TypeNode::List { data, .. } => {
                // TODO: handle cyclic case where entire cycle is aliases
                let (inner_ty_name, inner_visited_types) =
                    gen_type(data.items, nodes, dest, memo, opts, &my_path)?;
                merge_visited_paths_into(inner_visited_types, &mut visited_types);
                if let Some(true) = data.unique_items {
                    // let ty_name = format!("{inner_ty_name}Set");
                    gen_alias(
                        &mut dest.buf,
                        &ty_name,
                        &format!("std::collections::HashSet<{inner_ty_name}>"),
                    )?;
                    // ty_name
                } else {
                    // let ty_name = format!("{inner_ty_name}List");
                    gen_alias(&mut dest.buf, &ty_name, &format!("Vec<{inner_ty_name}>"))?;
                    // ty_name
                };
            }
        };
    }
    Ok((ty_name, visited_types))
}

fn merge_visited_paths_into(from: VisitedTypePath, into: &mut VisitedTypePath) {
    for (id, paths) in from {
        into.entry(id).or_default().extend(paths);
    }
}

fn is_path_unsized_cyclic(
    id: u32,
    my_path: &[u32],
    visited_path: &VisitedTypePath,
    nodes: &[TypeNode],
) -> Option<bool> {
    visited_path.get(&id).map(|cyclic_paths| {
        // for all cycles that lead back to current
        cyclic_paths
            .iter()
            .map(|path| {
                path[my_path.len()..]
                    .iter()
                    // until we arrive at current
                    .take_while(|&&dep_id| dep_id != id)
                    // see if any are lists
                    .any(|&dep_id| matches!(&nodes[dep_id as usize], TypeNode::List { .. }))
            })
            // we know this whole branch is unsized if
            // any one of the paths don't contain a
            // type stored on the heap i.e. a vec
            .any(|has_list| !has_list)
    })
}

fn replace_placeholder_ty_name(buf: &str, placeholder: &str, replacement: &str) -> String {
    buf.replace(placeholder, replacement).replace(
        &normalize_struct_prop_name(placeholder),
        &normalize_struct_prop_name(replacement),
    )
}

fn gen_derive(dest: &mut impl Write, opts: &GenTypesOptions) -> std::fmt::Result {
    let mut derive_args = vec![];
    if opts.derive_debug {
        derive_args.extend_from_slice(&["Debug"]);
    }
    if opts.derive_serde {
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

fn gen_alias(out: &mut impl Write, alias_name: &str, aliased_ty: &str) -> std::fmt::Result {
    writeln!(out, "pub type {alias_name} = {aliased_ty};")
}

/// `props` is a map of prop_name -> (TypeName, serialization_name)
fn gen_struct(
    dest: &mut impl Write,
    opts: &GenTypesOptions,
    ty_name: &str,
    props: IndexMap<String, (String, Option<String>)>,
) -> std::fmt::Result {
    gen_derive(dest, opts)?;
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
fn gen_enum(
    dest: &mut impl Write,
    opts: &GenTypesOptions,
    ty_name: &str,
    variants: Vec<(String, String)>,
) -> std::fmt::Result {
    gen_derive(dest, opts)?;
    writeln!(dest, "#[serde(untagged)]")?;
    writeln!(dest, "pub enum {ty_name} {{")?;
    for (var_name, ty_name) in variants.into_iter() {
        writeln!(dest, "    {var_name}({ty_name}),")?;
    }
    writeln!(dest, "}}")?;
    Ok(())
}

#[cfg(test)]
mod test {
    use crate::tests::default_type_node_base;

    use super::*;
    use common::typegraph::*;

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
        for (test_name, nodes, name, out) in cases {
            let mut dest = GenDestBuf { buf: String::new() };
            let (gen_name, _) = gen_type(
                nodes.len() as u32 - 1,
                &nodes,
                &mut dest,
                &mut HashMap::new(),
                &GenTypesOptions {
                    derive_serde: true,
                    derive_debug: true,
                },
                &[],
            )?;

            pretty_assertions::assert_eq!(
                &gen_name[..],
                name,
                "{test_name}: generated unexpected type name"
            );
            pretty_assertions::assert_eq!(
                dest.buf.as_str(),
                out,
                "{test_name}: output buffer was not equal for {name}",
            );
        }
        Ok(())
    }
}

/* static TEMPLATE: &'static str = r#"
{{- for trait derive_attrs -}}
{{- if @first -}}
#[derive(
{{- endif -}}
{trait},
{{- if @last -}}
#]
{{- endif -}}
{{- endfor }}
pub struct {ty_name} \\{
{{ for prop props }}
{{ if prop.rename }}   #[serde(rename = "{prop.name}")]{{ endif }}
    {prop.norm_name}: {prop.ty_name},
{{ endfor }}
}"#;
*/
