// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::manifest::{ManifestEntry, ManifestPage};
use super::{indent_lines_into, utils::*};
use crate::interlude::*;
use crate::shared::types::type_body_required;
use heck::ToPascalCase as _;
use std::fmt::Write;

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

#[derive(Debug, Clone)]
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
    boxed: bool,
}

impl ManifestEntry for RustType {
    type Extras = Derive;

    fn render(&self, out: &mut impl Write, page: &RustTypeManifestPage) -> std::fmt::Result {
        match self {
            Self::Alias {
                alias,
                name: alias_name,
                ..
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
                            let inner_name = page.get_ref(item).unwrap();
                            let inner_name = if *boxed {
                                format!("Box<{}>", inner_name)
                            } else {
                                inner_name
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
                    let mut ty_ref = page.get_ref(&prop.ty).unwrap();
                    if *partial && !prop.optional {
                        ty_ref = format!("Option<{}>", ty_ref)
                    } else if prop.boxed {
                        ty_ref = format!("Box<{}>", ty_ref)
                    }

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
                RustType::render_derive(out, derive)?;
                writeln!(out, "#[allow(clippy::large_enum_variant)]")?;
                writeln!(out, "#[serde(untagged)]")?;
                writeln!(out, "pub enum {} {{", name)?;
                for (var_name, ty) in variants.iter() {
                    writeln!(out, "    {}({}),", var_name, page.get_ref(ty).unwrap())?;
                }
                writeln!(out, "}}")
            }
        }
    }

    fn get_reference_expr(&self, page: &RustTypeManifestPage) -> Option<String> {
        Some(match self {
            Self::Alias { name, alias } => {
                if let Some(name) = name {
                    name.clone()
                } else {
                    // inlined
                    match alias {
                        Alias::BuiltIn(name) => name.to_string(),
                        Alias::Container { name, item, boxed } => {
                            self.container_def(name, item, *boxed, page)
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
        page: &RustTypeManifestPage,
    ) -> String {
        let inner_name = page.get_ref(item).unwrap();
        let inner_name = if boxed {
            format!("Box<{}>", inner_name)
        } else {
            inner_name
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

    fn new(ty: &Type, partial: bool) -> RustType {
        if type_body_required(ty) {
            let name = normalize_type_title(&ty.name());
            match ty {
                Type::Boolean(_) => RustType::builtin("bool", Some(name)),
                Type::Integer(_) => RustType::builtin("i64", Some(name)),
                Type::Float(_) => RustType::builtin("f64", Some(name)),
                Type::String(ty) => {
                    if let (Some(format), true) =
                        (ty.format_only(), ty.title().starts_with("string_"))
                    {
                        let name = Some(normalize_type_title(&format!(
                            "string_{format}_{}",
                            ty.idx()
                        )));
                        RustType::builtin("String", name)
                    } else {
                        RustType::builtin("String", Some(name))
                    }
                }
                Type::File(_) => RustType::builtin("super::FileId", Some(name)),
                Type::Optional(ty) => {
                    let item_ty = ty.item();
                    let is_composite = item_ty.is_composite();
                    if ty.default_value.is_none() && ty.title().starts_with("optional_") {
                        // no alias -- inline
                        RustType::container(
                            "Option",
                            item_ty.key(),
                            is_composite, // TODO is_cyclic
                            None,
                        )
                    } else {
                        RustType::container(
                            "Option",
                            item_ty.key(),
                            is_composite, // TODO is_cyclic
                            Some(name_with_suffix(&name, partial && is_composite)),
                        )
                    }
                }
                Type::List(ty) => {
                    let item_ty = ty.item();
                    let is_composite = item_ty.is_composite();
                    if matches!((ty.min_items, ty.max_items), (None, None))
                        && ty.title().starts_with("list_")
                    {
                        // no alias -- inline
                        let container_name = if ty.unique_items {
                            "std::collections::HashSet"
                        } else {
                            "Vec"
                        };
                        RustType::container(container_name, item_ty.key(), false, None)
                    } else {
                        let container_name = if ty.unique_items {
                            "std::collections::HashSet"
                        } else {
                            "Vec"
                        };
                        let name = name_with_suffix(&name, partial && is_composite);
                        RustType::container(container_name, item_ty.key(), false, Some(name))
                    }
                }

                Type::Object(ty) => {
                    let props = ty
                        .properties()
                        .iter()
                        .filter(|(_, prop)| !prop.is_injected())
                        .map(|(prop_name, prop)| {
                            let name = normalize_struct_prop_name(prop_name);
                            let rename = if prop_name.as_ref() != name.as_str() {
                                Some(prop_name.to_string())
                            } else {
                                None
                            };
                            let (optional, boxed) = match &prop.ty {
                                Type::Optional(_) => (true, false),
                                _ => (false, ty.is_descendant_of(&prop.ty)),
                            };
                            StructProp {
                                name,
                                rename,
                                ty: prop.ty.key(),
                                optional,
                                boxed,
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
                        .map(|variant| (variant.name().to_pascal_case(), variant.key()))
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
}

fn name_with_suffix(name: &str, partial: bool) -> String {
    if partial {
        format!("{}Partial", name)
    } else {
        name.to_string()
    }
}

type Extras = Derive;

pub type RustTypeManifestPage = ManifestPage<RustType, Extras>;

pub struct RustTypesSubmanifest {
    pub inputs: RustTypeManifestPage,
    pub outputs: Option<RustTypeManifestPage>,
    pub partial_outputs: Option<RustTypeManifestPage>,
}

#[derive(Default, Clone)]
pub enum OutputTypes {
    #[default]
    Partial,
    NonPartial,
    Both,
}

#[derive(Default)]
pub struct RustTypesConfig {
    output_types: OutputTypes,
    derive_serde: bool,
    derive_debug: bool,
}

impl RustTypesConfig {
    pub fn output_types(mut self, value: OutputTypes) -> Self {
        self.output_types = value;
        self
    }

    pub fn derive_serde(mut self, value: bool) -> Self {
        self.derive_serde = value;
        self
    }

    pub fn derive_debug(mut self, value: bool) -> Self {
        self.derive_debug = value;
        self
    }

    pub fn build_manifest(&self, tg: &Typegraph) -> RustTypesSubmanifest {
        let gen_config = Derive {
            serde: self.derive_serde,
            debug: self.derive_debug,
        };
        RustTypesSubmanifest::new(tg, &self.output_types, gen_config)
    }
}

impl RustTypesSubmanifest {
    fn new(tg: &Typegraph, output_types: &OutputTypes, gen_config: Extras) -> Self {
        let inputs = Self::get_inputs(tg, gen_config.clone());
        inputs.cache_references();

        let outputs = if matches!(output_types, OutputTypes::NonPartial | OutputTypes::Both) {
            let outputs = Self::get_outputs(tg, &inputs, gen_config.clone());
            outputs.cache_references();
            Some(outputs)
        } else {
            None
        };

        let partial_outputs = if matches!(output_types, OutputTypes::Partial | OutputTypes::Both) {
            let partial_outputs =
                Self::get_partial_outputs(tg, &inputs, outputs.as_ref(), gen_config.clone());
            partial_outputs.cache_references();
            Some(partial_outputs)
        } else {
            None
        };

        Self {
            inputs,
            outputs,
            partial_outputs,
        }
    }

    fn get_inputs(tg: &Typegraph, gen_config: Extras) -> RustTypeManifestPage {
        let mut map = IndexMap::new();

        for (key, ty) in tg.input_types.iter() {
            map.insert(*key, RustType::new(ty, false));
        }

        ManifestPage::with_extras(map, gen_config)
    }

    fn get_outputs(
        tg: &Typegraph,
        inputs: &RustTypeManifestPage,
        gen_config: Extras,
    ) -> RustTypeManifestPage {
        let mut map = IndexMap::new();

        for (key, ty) in tg.output_types.iter() {
            if let Some(inp_ref) = inputs.get_ref(&ty.key()) {
                let alias = Alias::Plain {
                    name: inp_ref.clone(),
                };
                map.insert(*key, RustType::Alias { alias, name: None });
            } else {
                map.insert(*key, RustType::new(ty, false));
            }
        }

        ManifestPage::with_extras(map, gen_config)
    }

    fn get_partial_outputs(
        tg: &Typegraph,
        inputs: &RustTypeManifestPage,
        outputs: Option<&RustTypeManifestPage>,
        gen_config: Extras,
    ) -> RustTypeManifestPage {
        let mut map = IndexMap::new();

        for (key, ty) in tg.output_types.iter() {
            let partial = ty.is_composite();
            if !partial {
                // alias to input type if exists
                if let Some(inp_ref) = inputs.get_ref(&ty.key()) {
                    let alias = Alias::Plain {
                        name: inp_ref.clone(),
                    };
                    map.insert(*key, RustType::Alias { alias, name: None });
                    continue;
                }

                // alias to output type if exists
                if let Some(out_ref) = outputs.and_then(|page| page.get_ref(&ty.key())) {
                    let alias = Alias::Plain {
                        name: out_ref.clone(),
                    };
                    map.insert(*key, RustType::Alias { alias, name: None });
                    continue;
                }

                map.insert(*key, RustType::new(ty, false));
            } else {
                map.insert(*key, RustType::new(ty, true));
            }
        }

        ManifestPage::with_extras(map, gen_config)
    }

    pub fn render_all(&self, out: &mut impl Write) -> std::fmt::Result {
        writeln!(out, "// input types")?;
        self.inputs.render_all(out)?;
        writeln!(out, "// partial output types")?;
        self.partial_outputs
            .as_ref()
            .map(|page| page.render_all(out))
            .transpose()?;
        writeln!(out, "// output types")?;
        self.outputs
            .as_ref()
            .map(|page| page.render_all(out))
            .transpose()?;
        Ok(())
    }

    pub fn render_full(&self, out: &mut impl Write) -> std::fmt::Result {
        writeln!(out, "use types::*;")?;
        writeln!(out, "#[allow(unused)]")?;
        writeln!(out, "pub mod types {{")?;

        let mut buffer = String::new();
        self.render_all(&mut buffer)?;
        indent_lines_into(out, &buffer, "    ")?;

        writeln!(out, "}}")?;
        Ok(())
    }
}

#[cfg(test)]
mod test {
    use typegraph::TypegraphExpansionConfig;

    use super::*;
    use crate::tests::{create_typegraph, default_type_node_base};

    #[test]
    fn ty_generation_test() -> anyhow::Result<()> {
        use tg_schema::*;
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
                            items: 4,
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
                            items: 4,
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
                            item: 4,
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
                                ("myString".to_string(), 4),
                                ("list".to_string(), 5),
                                ("optional".to_string(), 7),
                            ]
                            .into_iter()
                            .collect(),
                            policies: Default::default(),
                            id: vec![],
                            required: vec![],
                            additional_props: false,
                        },
                        base: TypeNodeBase {
                            title: "my_obj".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Either {
                        data: EitherTypeData {
                            one_of: vec![4, 5, 6, 7, 8, 9, 10, 11, 12],
                        },
                        base: TypeNodeBase {
                            title: "my_either".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Union {
                        data: UnionTypeData {
                            any_of: vec![4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
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
pub type MyFile = super::FileId;
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct MyObj {
    #[serde(rename = "myString")]
    pub my_string: MyStr,
    pub list: MyStrList,
    pub optional: MyStrMaybe,
}
#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[allow(clippy::large_enum_variant)]
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
#[allow(clippy::large_enum_variant)]
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
                            items: 4,
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
                            items: 4,
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
                            item: 4,
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
                "super::FileId",
                r#""#,
            ),
            (
                "cycles_obj",
                vec![
                    TypeNode::Object {
                        data: ObjectTypeData {
                            properties: [("obj_b".to_string(), 5)].into_iter().collect(),
                            id: vec![],
                            required: ["obj_b"].into_iter().map(Into::into).collect(),
                            policies: Default::default(),
                            additional_props: false,
                        },
                        base: TypeNodeBase {
                            title: "ObjA".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Object {
                        data: ObjectTypeData {
                            properties: [("obj_c".to_string(), 6)].into_iter().collect(),
                            policies: Default::default(),
                            id: vec![],
                            required: ["obj_c"].into_iter().map(Into::into).collect(),
                            additional_props: false,
                        },
                        base: TypeNodeBase {
                            title: "ObjB".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Object {
                        data: ObjectTypeData {
                            properties: [("obj_a".to_string(), 4)].into_iter().collect(),
                            policies: Default::default(),
                            id: vec![],
                            required: ["obj_a"].into_iter().map(Into::into).collect(),
                            additional_props: false,
                        },
                        base: TypeNodeBase {
                            title: "ObjC".into(),
                            ..default_type_node_base()
                        },
                    },
                ],
                "ObjC",
                r#"#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ObjA {
    pub obj_b: Box<ObjB>,
}
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ObjB {
    pub obj_c: Box<ObjC>,
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
                            properties: [("obj_b".to_string(), 5)].into_iter().collect(),
                            policies: Default::default(),
                            id: vec![],
                            required: ["obj_b"].into_iter().map(Into::into).collect(),
                            additional_props: false,
                        },
                        base: TypeNodeBase {
                            title: "ObjA".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Object {
                        data: ObjectTypeData {
                            properties: [("union_c".to_string(), 6)].into_iter().collect(),
                            policies: Default::default(),
                            id: vec![],
                            required: ["union_c"].into_iter().map(Into::into).collect(),
                            additional_props: false,
                        },
                        base: TypeNodeBase {
                            title: "ObjB".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Union {
                        data: UnionTypeData { any_of: vec![4] },
                        base: TypeNodeBase {
                            title: "CUnion".into(),
                            ..default_type_node_base()
                        },
                    },
                ],
                "CUnion",
                r#"#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ObjA {
    pub obj_b: Box<ObjB>,
}
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ObjB {
    pub union_c: Box<CUnion>,
}
#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[allow(clippy::large_enum_variant)]
#[serde(untagged)]
pub enum CUnion {
    ObjA(ObjA),
}
"#,
            ),
            (
                "cycles_either",
                vec![
                    TypeNode::Object {
                        data: ObjectTypeData {
                            properties: [("obj_b".to_string(), 5)].into_iter().collect(),
                            policies: Default::default(),
                            id: vec![],
                            required: ["obj_b"].into_iter().map(Into::into).collect(),
                            additional_props: false,
                        },
                        base: TypeNodeBase {
                            title: "ObjA".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Object {
                        data: ObjectTypeData {
                            properties: [("either_c".to_string(), 6)].into_iter().collect(),
                            policies: Default::default(),
                            id: vec![],
                            required: ["either_c"].into_iter().map(Into::into).collect(),
                            additional_props: false,
                        },
                        base: TypeNodeBase {
                            title: "ObjB".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Either {
                        data: EitherTypeData { one_of: vec![4] },
                        base: TypeNodeBase {
                            title: "CEither".into(),
                            ..default_type_node_base()
                        },
                    },
                ],
                "CEither",
                r#"#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ObjA {
    pub obj_b: Box<ObjB>,
}
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ObjB {
    pub either_c: Box<CEither>,
}
#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[allow(clippy::large_enum_variant)]
#[serde(untagged)]
pub enum CEither {
    ObjA(ObjA),
}
"#,
            ),
        ];
        for (test_name, nodes, name, test_out) in cases {
            // TODO
            // let config = Arc::new(RustTypeRenderer {
            //     derive_serde: true,
            //     derive_debug: true,
            //     all_fields_optional: false,
            // });

            let tg = create_typegraph(name.into(), nodes)?;
            let tg = TypegraphExpansionConfig::default().expand_with_default_params(tg)?;
            let mut manifest = RustTypesConfig::default()
                .output_types(OutputTypes::NonPartial)
                .build_manifest(&tg);
            let mut outputs = std::mem::take(&mut manifest.outputs).unwrap();
            let first = *outputs.map.first().unwrap().0;
            outputs.map.shift_remove(&first);

            let real_out = outputs.render_all_buffered()?;

            // pretty_assertions::assert_eq!(
            //     &gen_name[..],
            //     name,
            //     "{test_name}: generated unexpected type name"
            // );
            pretty_assertions::assert_eq!(
                real_out,
                test_out,
                "{test_name}: output buffer was not equal for {name}",
            );
        }
        Ok(())
    }
}
