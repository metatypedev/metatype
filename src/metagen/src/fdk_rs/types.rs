// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::manifest::{ManifestPage, TypeRenderer};
use super::utils::*;
use crate::interlude::*;
use crate::shared::types::type_body_required;
use heck::ToPascalCase as _;
use std::fmt::Write;

// #[cfg(test)]
// mod test {
//     use typegraph::{conv::Key, Arc, StringType, TypeBase, WeakType};
//
//     use crate::tests::default_type_node_base;
//
//     use super::*;
//
//     fn type_base(idx: u32, title: String) -> TypeBase {
//         let res = TypeBase {
//             type_idx: idx,
//             parent: WeakType::Object(Default::default()),
//             title: title.clone(),
//             description: None,
//             key: Key::Output(Default::default()),
//             name: Default::default(),
//         };
//         res.name.set(Arc::new(title.into()));
//         res
//     }
//
//     #[test]
//     fn ty_generation_test() -> anyhow::Result<()> {
//         let cases = [
//             (
//                 "kitchen_sink",
//                 vec![
//                     TypeNode::String {
//                         data: StringTypeData {
//                             format: None,
//                             pattern: None,
//                             min_length: None,
//                             max_length: None,
//                         },
//                         base: TypeNodeBase {
//                             title: "my_str".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                     TypeNode::List {
//                         data: ListTypeData {
//                             items: 0,
//                             max_items: None,
//                             min_items: None,
//                             unique_items: None,
//                         },
//                         base: TypeNodeBase {
//                             title: "my_str_list".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                     TypeNode::List {
//                         data: ListTypeData {
//                             items: 0,
//                             max_items: None,
//                             min_items: None,
//                             unique_items: Some(true),
//                         },
//                         base: TypeNodeBase {
//                             title: "my_str_set".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                     TypeNode::Optional {
//                         data: OptionalTypeData {
//                             item: 0,
//                             default_value: None,
//                         },
//                         base: TypeNodeBase {
//                             title: "my_str_maybe".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                     TypeNode::Integer {
//                         data: IntegerTypeData {
//                             maximum: None,
//                             multiple_of: None,
//                             exclusive_minimum: None,
//                             exclusive_maximum: None,
//                             minimum: None,
//                         },
//                         base: TypeNodeBase {
//                             title: "my_int".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                     TypeNode::Float {
//                         data: FloatTypeData {
//                             maximum: None,
//                             multiple_of: None,
//                             exclusive_minimum: None,
//                             exclusive_maximum: None,
//                             minimum: None,
//                         },
//                         base: TypeNodeBase {
//                             title: "my_float".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                     TypeNode::Boolean {
//                         base: TypeNodeBase {
//                             title: "my_bool".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                     TypeNode::File {
//                         data: FileTypeData {
//                             min_size: None,
//                             max_size: None,
//                             mime_types: None,
//                         },
//                         base: TypeNodeBase {
//                             title: "my_file".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                     TypeNode::Object {
//                         data: ObjectTypeData {
//                             properties: [
//                                 ("myString".to_string(), 0),
//                                 ("list".to_string(), 1),
//                                 ("optional".to_string(), 3),
//                             ]
//                             .into_iter()
//                             .collect(),
//                             policies: Default::default(),
//                             id: vec![],
//                             // FIXME: remove required
//                             required: vec![],
//                         },
//                         base: TypeNodeBase {
//                             title: "my_obj".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                     TypeNode::Either {
//                         data: EitherTypeData {
//                             one_of: vec![0, 1, 2, 3, 4, 5, 6, 7, 8],
//                         },
//                         base: TypeNodeBase {
//                             title: "my_either".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                     TypeNode::Union {
//                         data: UnionTypeData {
//                             any_of: vec![0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
//                         },
//                         base: TypeNodeBase {
//                             title: "my_union".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                 ],
//                 "MyUnion",
//                 r#"pub type MyStr = String;
// pub type MyStrList = Vec<MyStr>;
// pub type MyStrSet = std::collections::HashSet<MyStr>;
// pub type MyStrMaybe = Option<MyStr>;
// pub type MyInt = i64;
// pub type MyFloat = f64;
// pub type MyBool = bool;
// pub type MyFile = super::FileId;
// #[derive(Debug, serde::Serialize, serde::Deserialize)]
// pub struct MyObj {
//     #[serde(rename = "myString")]
//     pub my_string: MyStr,
//     pub list: MyStrList,
//     pub optional: MyStrMaybe,
// }
// #[derive(Debug, serde::Serialize, serde::Deserialize)]
// #[serde(untagged)]
// pub enum MyEither {
//     MyStr(MyStr),
//     MyStrList(MyStrList),
//     MyStrSet(MyStrSet),
//     MyStrMaybe(MyStrMaybe),
//     MyInt(MyInt),
//     MyFloat(MyFloat),
//     MyBool(MyBool),
//     MyFile(MyFile),
//     MyObj(MyObj),
// }
// #[derive(Debug, serde::Serialize, serde::Deserialize)]
// #[serde(untagged)]
// pub enum MyUnion {
//     MyStr(MyStr),
//     MyStrList(MyStrList),
//     MyStrSet(MyStrSet),
//     MyStrMaybe(MyStrMaybe),
//     MyInt(MyInt),
//     MyFloat(MyFloat),
//     MyBool(MyBool),
//     MyFile(MyFile),
//     MyObj(MyObj),
//     MyEither(MyEither),
// }
// "#,
//             ),
//             (
//                 "alias_avoidance",
//                 vec![
//                     TypeNode::String {
//                         data: StringTypeData {
//                             format: None,
//                             pattern: None,
//                             min_length: None,
//                             max_length: None,
//                         },
//                         base: TypeNodeBase {
//                             title: "string_0".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                     TypeNode::List {
//                         data: ListTypeData {
//                             items: 0,
//                             max_items: None,
//                             min_items: None,
//                             unique_items: None,
//                         },
//                         base: TypeNodeBase {
//                             title: "list_1".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                     TypeNode::List {
//                         data: ListTypeData {
//                             items: 0,
//                             max_items: None,
//                             min_items: None,
//                             unique_items: Some(true),
//                         },
//                         base: TypeNodeBase {
//                             title: "list_2".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                     TypeNode::Optional {
//                         data: OptionalTypeData {
//                             item: 0,
//                             default_value: None,
//                         },
//                         base: TypeNodeBase {
//                             title: "optional_3".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                     TypeNode::Integer {
//                         data: IntegerTypeData {
//                             maximum: None,
//                             multiple_of: None,
//                             exclusive_minimum: None,
//                             exclusive_maximum: None,
//                             minimum: None,
//                         },
//                         base: TypeNodeBase {
//                             title: "integer_4".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                     TypeNode::Float {
//                         data: FloatTypeData {
//                             maximum: None,
//                             multiple_of: None,
//                             exclusive_minimum: None,
//                             exclusive_maximum: None,
//                             minimum: None,
//                         },
//                         base: TypeNodeBase {
//                             title: "float_5".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                     TypeNode::Boolean {
//                         base: TypeNodeBase {
//                             title: "boolean_6".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                     TypeNode::File {
//                         data: FileTypeData {
//                             min_size: None,
//                             max_size: None,
//                             mime_types: None,
//                         },
//                         base: TypeNodeBase {
//                             title: "file_7".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                 ],
//                 "super::FileId",
//                 r#""#,
//             ),
//             (
//                 "cycles_obj",
//                 vec![
//                     TypeNode::Object {
//                         data: ObjectTypeData {
//                             properties: [("obj_b".to_string(), 1)].into_iter().collect(),
//                             id: vec![],
//                             required: ["obj_b"].into_iter().map(Into::into).collect(),
//                             policies: Default::default(),
//                         },
//                         base: TypeNodeBase {
//                             title: "ObjA".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                     TypeNode::Object {
//                         data: ObjectTypeData {
//                             properties: [("obj_c".to_string(), 2)].into_iter().collect(),
//                             policies: Default::default(),
//                             id: vec![],
//                             required: ["obj_c"].into_iter().map(Into::into).collect(),
//                         },
//                         base: TypeNodeBase {
//                             title: "ObjB".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                     TypeNode::Object {
//                         data: ObjectTypeData {
//                             properties: [("obj_a".to_string(), 0)].into_iter().collect(),
//                             policies: Default::default(),
//                             id: vec![],
//                             required: ["obj_a"].into_iter().map(Into::into).collect(),
//                         },
//                         base: TypeNodeBase {
//                             title: "ObjC".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                 ],
//                 "ObjC",
//                 r#"#[derive(Debug, serde::Serialize, serde::Deserialize)]
// pub struct ObjB {
//     pub obj_c: ObjC,
// }
// #[derive(Debug, serde::Serialize, serde::Deserialize)]
// pub struct ObjA {
//     pub obj_b: ObjB,
// }
// #[derive(Debug, serde::Serialize, serde::Deserialize)]
// pub struct ObjC {
//     pub obj_a: Box<ObjA>,
// }
// "#,
//             ),
//             (
//                 "cycles_union",
//                 vec![
//                     TypeNode::Object {
//                         data: ObjectTypeData {
//                             properties: [("obj_b".to_string(), 1)].into_iter().collect(),
//                             policies: Default::default(),
//                             id: vec![],
//                             required: ["obj_b"].into_iter().map(Into::into).collect(),
//                         },
//                         base: TypeNodeBase {
//                             title: "ObjA".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                     TypeNode::Object {
//                         data: ObjectTypeData {
//                             properties: [("union_c".to_string(), 2)].into_iter().collect(),
//                             policies: Default::default(),
//                             id: vec![],
//                             required: ["union_c"].into_iter().map(Into::into).collect(),
//                         },
//                         base: TypeNodeBase {
//                             title: "ObjB".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                     TypeNode::Union {
//                         data: UnionTypeData { any_of: vec![0] },
//                         base: TypeNodeBase {
//                             title: "CUnion".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                 ],
//                 "CUnion",
//                 r#"#[derive(Debug, serde::Serialize, serde::Deserialize)]
// pub struct ObjB {
//     pub union_c: CUnion,
// }
// #[derive(Debug, serde::Serialize, serde::Deserialize)]
// pub struct ObjA {
//     pub obj_b: ObjB,
// }
// #[derive(Debug, serde::Serialize, serde::Deserialize)]
// #[serde(untagged)]
// pub enum CUnion {
//     ObjA(Box<ObjA>),
// }
// "#,
//             ),
//             (
//                 "cycles_either",
//                 vec![
//                     TypeNode::Object {
//                         data: ObjectTypeData {
//                             properties: [("obj_b".to_string(), 1)].into_iter().collect(),
//                             policies: Default::default(),
//                             id: vec![],
//                             required: ["obj_b"].into_iter().map(Into::into).collect(),
//                         },
//                         base: TypeNodeBase {
//                             title: "ObjA".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                     TypeNode::Object {
//                         data: ObjectTypeData {
//                             properties: [("either_c".to_string(), 2)].into_iter().collect(),
//                             policies: Default::default(),
//                             id: vec![],
//                             required: ["either_c"].into_iter().map(Into::into).collect(),
//                         },
//                         base: TypeNodeBase {
//                             title: "ObjB".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                     TypeNode::Either {
//                         data: EitherTypeData { one_of: vec![0] },
//                         base: TypeNodeBase {
//                             title: "CEither".into(),
//                             ..default_type_node_base()
//                         },
//                     },
//                 ],
//                 "CEither",
//                 r#"#[derive(Debug, serde::Serialize, serde::Deserialize)]
// pub struct ObjB {
//     pub either_c: CEither,
// }
// #[derive(Debug, serde::Serialize, serde::Deserialize)]
// pub struct ObjA {
//     pub obj_b: ObjB,
// }
// #[derive(Debug, serde::Serialize, serde::Deserialize)]
// #[serde(untagged)]
// pub enum CEither {
//     ObjA(Box<ObjA>),
// }
// "#,
//             ),
//         ];
//         for (test_name, nodes, name, test_out) in cases {
//             let mut renderer = TypeRenderer::new(
//                 nodes.iter().cloned().map(Arc::new).collect::<Vec<_>>(),
//                 Arc::new(RustTypeRenderer {
//                     derive_serde: true,
//                     derive_debug: true,
//                     all_fields_optional: false,
//                 }),
//             );
//             let gen_name = renderer.render(nodes.len() as u32 - 1)?;
//             let (real_out, _) = renderer.finalize();
//
//             pretty_assertions::assert_eq!(
//                 &gen_name[..],
//                 name,
//                 "{test_name}: generated unexpected type name"
//             );
//             pretty_assertions::assert_eq!(
//                 real_out,
//                 test_out,
//                 "{test_name}: output buffer was not equal for {name}",
//             );
//         }
//         Ok(())
//     }
// }

#[derive(Debug)]
pub enum Alias {
    BuiltIn(&'static str),
    Container {
        name: &'static str,
        item: TypeKey,
        boxed: bool,
    },
    Plain {
        name: String,
    },
}

#[derive(Debug)]
pub struct Derive {
    debug: bool,
    serde: bool,
}

#[derive(Debug)]
pub enum RustType {
    Alias {
        alias: Alias,
        /// inlined if name is none
        name: Option<String>,
    },
    Struct {
        name: String,
        derive: Derive,
        properties: Vec<StructProp>,
        partial: bool,
    },
    Enum {
        name: String,
        derive: Derive,
        variants: Vec<(String, TypeKey)>,
        partial: bool,
    },
}

#[derive(Debug)]
pub struct StructProp {
    name: String,
    rename: Option<String>,
    ty: TypeKey,
    optional: bool,
}

type Context = ();

impl TypeRenderer for RustType {
    type Context = Context;
    fn render(
        &self,
        out: &mut impl Write,
        page: &ManifestPage<Self>,
        ctx: &Context,
    ) -> std::fmt::Result {
        match self {
            Self::Alias {
                alias,
                name: alias_name,
            } => {
                if let Some(alias_name) = alias_name {
                    match alias {
                        Alias::BuiltIn(name) => {
                            writeln!(out, "pub type {} = {};", alias_name, name)
                        }
                        Alias::Container {
                            name: container_name,
                            item,
                            boxed,
                        } => {
                            let inner_name = page.get_ref(item, ctx).unwrap();
                            let inner_name = if *boxed {
                                format!("Box<{}>", inner_name)
                            } else {
                                inner_name.into()
                            };
                            writeln!(
                                out,
                                "pub type {} = {}<{}>;",
                                alias_name, container_name, inner_name
                            )
                        }
                        _ => unreachable!(),
                    }
                } else {
                    Ok(())
                }
            }

            Self::Struct {
                name,
                derive,
                properties,
                partial,
            } => {
                RustType::render_derive(out, derive)?;
                let name = if *partial {
                    format!("{}Partial", name)
                } else {
                    name.clone()
                };
                writeln!(out, "pub struct {} {{", name)?;
                for prop in properties.iter() {
                    if let Some(rename) = &prop.rename {
                        writeln!(out, r#"    #[serde(rename = "{}")]"#, rename)?;
                    }
                    let ty_ref = page.get_ref(&prop.ty, ctx).unwrap();
                    let ty_ref = if *partial && !prop.optional {
                        format!("Option<{}>", ty_ref)
                    } else {
                        ty_ref
                    };

                    writeln!(out, "    pub {}: {},", prop.name, ty_ref)?;
                }
                writeln!(out, "}}")
            }

            Self::Enum {
                name,
                derive,
                variants,
                partial,
            } => {
                let name = if *partial {
                    format!("{}Partial", name)
                } else {
                    name.clone()
                };
                RustType::render_derive(out, &derive)?;
                writeln!(out, "#[serde(untagged)]")?;
                writeln!(out, "pub enum {} {{", name)?;
                for (var_name, ty) in variants.iter() {
                    writeln!(
                        out,
                        "    {}({}),",
                        var_name,
                        page.get_ref(&ty, ctx).unwrap()
                    )?;
                }
                writeln!(out, "}}")
            }
        }
    }

    fn get_reference_expr(&self, page: &ManifestPage<Self>, ctx: &Context) -> Option<String> {
        Some(match self {
            Self::Alias { name, alias } => {
                if let Some(name) = name {
                    name.clone()
                } else {
                    // inlined
                    match alias {
                        Alias::BuiltIn(name) => name.to_string(),
                        Alias::Container { name, item, boxed } => {
                            self.container_def(name, item, *boxed, page, ctx)
                        }
                        Alias::Plain { name } => name.clone(),
                    }
                }
            }
            Self::Struct { name, partial, .. } => {
                if *partial {
                    format!("{}Partial", name)
                } else {
                    name.clone()
                }
            }
            Self::Enum { name, partial, .. } => {
                if *partial {
                    format!("{}Partial", name)
                } else {
                    name.clone()
                }
            }
        })
    }
}

impl RustType {
    fn container_def(
        &self,
        name: &str,
        item: &TypeKey,
        boxed: bool,
        page: &ManifestPage<Self>,
        ctx: &Context,
    ) -> String {
        let inner_name = page.get_ref(item, ctx).unwrap();
        let inner_name = if boxed {
            format!("Box<{}>", inner_name)
        } else {
            inner_name.into()
        };
        format!("{}<{}>", name, inner_name)
    }

    fn render_derive(out: &mut impl Write, spec: &Derive) -> std::fmt::Result {
        let mut derive_args = vec![];
        if spec.debug {
            derive_args.extend_from_slice(&["Debug"]);
        }
        if spec.serde {
            derive_args.extend_from_slice(&["serde::Serialize", "serde::Deserialize"]);
        }
        if !derive_args.is_empty() {
            write!(out, "#[derive(")?;
            let last = derive_args.pop().unwrap();
            for arg in derive_args {
                write!(out, "{arg}, ")?;
            }
            write!(out, "{last}")?;
            writeln!(out, ")]")?;
        }
        Ok(())
    }

    fn builtin(target: &'static str, name: Option<String>) -> RustType {
        RustType::Alias {
            alias: Alias::BuiltIn(target),
            name,
        }
    }

    fn container(
        container_name: &'static str,
        item: TypeKey,
        boxed: bool,
        name: Option<String>,
    ) -> RustType {
        RustType::Alias {
            alias: Alias::Container {
                name: container_name,
                item,
                boxed,
            },
            name,
        }
    }
}

fn get_typespec(ty: &Type, partial: bool) -> RustType {
    if type_body_required(ty) {
        let name = Some(normalize_type_title(&ty.name()));
        match ty {
            Type::Boolean(_) => RustType::builtin("bool", name),
            Type::Integer(_) => RustType::builtin("i64", name),
            Type::Float(_) => RustType::builtin("f64", name),
            Type::String(ty) => {
                if let (Some(format), true) = (ty.format_only(), ty.title().starts_with("string_"))
                {
                    let name = Some(normalize_type_title(&format!(
                        "string_{format}_{}",
                        ty.idx()
                    )));
                    RustType::builtin("String", name)
                } else {
                    RustType::builtin("String", name)
                }
            }
            Type::File(_) => RustType::builtin("super::FileId", name),
            Type::Optional(ty) => {
                let item_ty = ty.item();
                if ty.default_value.is_none() && ty.title().starts_with("optional_") {
                    // no alias -- inline
                    RustType::container(
                        "Option",
                        item_ty.key().clone(),
                        item_ty.is_composite(), // TODO is_cyclic
                        None,
                    )
                } else {
                    RustType::container(
                        "Option",
                        item_ty.key().clone(),
                        item_ty.is_composite(), // TODO is_cyclic
                        name,
                    )
                }
            }
            Type::List(ty) => {
                let item_ty = ty.item();
                if matches!((ty.min_items, ty.max_items), (None, None))
                    && ty.title().starts_with("list_")
                {
                    // no alias -- inline
                    // let map = map.clone();
                    let container_name = if ty.unique_items {
                        "std::collections::HashSet"
                    } else {
                        "Vec"
                    };
                    RustType::container(
                        container_name,
                        item_ty.key().clone(),
                        item_ty.is_composite(), // TODO is_cyclic
                        None,
                    )
                } else {
                    let container_name = if ty.unique_items {
                        "std::collections::HashSet"
                    } else {
                        "Vec"
                    };
                    RustType::container(
                        container_name,
                        item_ty.key().clone(),
                        item_ty.is_composite(), // TODO is_cyclic
                        name,
                    )
                }
            }

            Type::Object(ty) => {
                let props = ty
                    .properties()
                    .iter()
                    .map(|(prop_name, prop)| {
                        let name = normalize_struct_prop_name(prop_name);
                        let rename = if prop_name.as_ref() != name.as_str() {
                            Some(prop_name.to_string())
                        } else {
                            None
                        };
                        StructProp {
                            name,
                            rename,
                            ty: prop.type_.key().clone(),
                            optional: matches!(&prop.type_, Type::Optional(_)),
                        }
                    })
                    .collect();
                RustType::Struct {
                    name: normalize_type_title(&ty.name()),
                    derive: Derive {
                        debug: true,
                        serde: true,
                    },
                    properties: props,
                    partial,
                }
            }

            Type::Union(ty) => {
                let variants = ty
                    .variants()
                    .iter()
                    .map(|variant| (variant.name().to_pascal_case(), variant.key().clone()))
                    .collect();
                RustType::Enum {
                    name: normalize_type_title(&ty.name()),
                    derive: Derive {
                        debug: true,
                        serde: true,
                    },
                    variants,
                    partial,
                }
            }

            Type::Function(_) => unreachable!("unexpected function type"),
        }
    } else {
        RustType::builtin(
            match ty {
                Type::Boolean(_) => "bool",
                Type::Integer(_) => "i64",
                Type::Float(_) => "f64",
                Type::String(_) => "String",
                Type::File(_) => "super::FileId",
                _ => unreachable!("unexpected non-composite type: {:?}", ty.tag()),
            },
            None,
        )
    }
}

pub fn input_manifest_page(tg: &Typegraph) -> ManifestPage<RustType> {
    let mut map = IndexMap::new();

    for (key, ty) in tg.input_types.iter() {
        let typespec = get_typespec(ty, false);
        map.insert(key.clone(), typespec);
    }

    let res: ManifestPage<RustType> = map.into();
    res.cache_references(&());

    res
}

pub fn output_manifest_page(
    tg: &Typegraph,
    partial: bool,
    input_page: &ManifestPage<RustType>,
) -> ManifestPage<RustType> {
    let mut map = IndexMap::new();

    for (key, ty) in tg.output_types.iter() {
        let partial = partial && ty.is_composite();
        if !partial {
            // alias to input type if exists
            if let Some(inp_ref) = input_page.get_ref(&ty.key(), &()) {
                let alias = Alias::Plain {
                    name: inp_ref.clone(),
                };
                let typespec = RustType::Alias { alias, name: None };
                map.insert(key.clone(), typespec);
                continue;
            }
        }
        let typespec = get_typespec(ty, partial);
        map.insert(key.clone(), typespec);
    }

    let res = ManifestPage::from(map);
    res.cache_references(&());

    res
}
