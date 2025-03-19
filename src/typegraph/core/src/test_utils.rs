// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub(crate) use crate::sdk::runtimes::{Effect, MaterializerDenoFunc};

impl MaterializerDenoFunc {
    pub fn with_code(code: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            secrets: vec![],
        }
    }
}

impl Default for Effect {
    fn default() -> Self {
        Self::Read
    }
}

pub mod models {
    use std::collections::BTreeMap;

    use tg_schema::{EffectType, Injection, InjectionData};

    use crate::errors::Result;
    use crate::t::{self, TypeBuilder};
    use crate::types::TypeId;

    pub fn simple_record() -> Result<TypeId> {
        let mut created_at_injection_map = BTreeMap::new();
        created_at_injection_map.insert(
            EffectType::Create,
            serde_json::Value::String("now".to_string()),
        );
        let created_at = t::string()
            .format("date-time")
            .inject(Injection::Dynamic(InjectionData::ValueByEffect(
                created_at_injection_map,
            )))
            .build()?;

        t::struct_()
            .propx(
                "id",
                t::string().format("uuid").config("auto", true).as_id(),
            )?
            .propx("name", t::string())?
            .propx("age", t::optionalx(t::integer())?)?
            .prop("created_at", created_at)
            .build_named("Record")
    }

    pub fn simple_relationship() -> Result<(TypeId, TypeId)> {
        let user = t::struct_()
            .propx("id", t::integer().as_id())?
            .propx("name", t::string())?
            .propx("posts", t::listx(t::ref_("Post", Default::default()))?)?
            .build_named("User")?;

        let post = t::struct_()
            .propx("id", t::integer().config("auto", true).as_id())?
            .propx("title", t::string())?
            .propx("author", t::ref_("User", Default::default()))?
            .build_named("Post")?;

        Ok((user, post))
    }
}

pub fn setup(name: Option<&str>) -> crate::errors::Result<()> {
    use crate::sdk::core::Handler;

    crate::Lib::init_typegraph(crate::sdk::core::TypegraphInitParams {
        name: name
            .map(|n| n.to_string())
            .unwrap_or_else(|| "test".to_string()),
        path: ".".to_string(),
        ..Default::default()
    })
}

pub mod tree {
    use std::{borrow::Cow, io::Write, rc::Rc};

    use ptree::{print_config::StyleWhen, IndentChars, PrintConfig, Style, TreeItem};

    use crate::types::{AsTypeDefEx as _, FlatTypeRefTarget, Type, TypeDef, TypeDefExt, TypeId};

    pub struct PrintOptions {
        no_indent_lines: bool,
        indent_size: u16,
    }

    impl PrintOptions {
        pub fn new() -> Self {
            Self {
                no_indent_lines: false,
                indent_size: 4,
            }
        }

        pub fn no_indent_lines(mut self) -> Self {
            self.no_indent_lines = true;
            self
        }

        #[allow(dead_code)]
        pub fn indent_size(mut self, size: u16) -> Self {
            self.indent_size = size;
            self
        }

        pub fn print(&self, type_id: TypeId) -> String {
            let mut config = PrintConfig {
                indent: self.indent_size as usize,
                styled: StyleWhen::Never,
                ..Default::default()
            };
            if self.no_indent_lines {
                config.characters = IndentChars {
                    down_and_right: " ".to_string(),
                    down: " ".to_string(),
                    turn_right: " ".to_string(),
                    right: " ".to_string(),
                    empty: " ".to_string(),
                };
            }

            let root = Node {
                label: "root".into(),
                type_id,
                parents: Rc::new(vec![]),
            };

            let mut buf: Vec<u8> = vec![];
            ptree::write_tree_with(&root, &mut buf, &config).expect("could not write tree");

            String::from_utf8(buf).unwrap()
        }
    }

    #[derive(Clone)]
    struct Node {
        label: String,
        type_id: TypeId,
        parents: Rc<Vec<TypeId>>,
    }

    pub fn print(type_id: TypeId) -> String {
        PrintOptions::new().print(type_id)
    }

    impl TreeItem for Node {
        type Child = Self;

        fn write_self<W: Write>(&self, f: &mut W, _style: &Style) -> std::io::Result<()> {
            let ty = self.type_id.as_type().unwrap();
            let (name, title) = match ty {
                Type::Def(type_def) => (type_def.data().variant_name().to_owned(), None),
                Type::Ref(type_ref) => {
                    let flat = type_ref.flatten();
                    match flat.target {
                        FlatTypeRefTarget::Direct(def) => {
                            (def.data().variant_name().to_owned(), flat.name)
                        }
                        FlatTypeRefTarget::Indirect(name) => (format!("&{}", name), None),
                    }
                }
            };

            let enum_variants: Option<Vec<String>> = self
                .type_id
                .as_xdef()
                .map(|xdef| match &xdef.type_def {
                    TypeDef::Integer(typ) => typ
                        .data
                        .enumeration
                        .clone()
                        .map(|v| v.iter().map(|v| v.to_string()).collect()),
                    TypeDef::Float(typ) => typ
                        .data
                        .enumeration
                        .clone()
                        .map(|v| v.iter().map(|v| v.to_string()).collect()),
                    TypeDef::String(typ) => typ
                        .data
                        .enumeration
                        .clone()
                        .map(|v| v.iter().map(|v| format!("'{v}'")).collect()),
                    _ => None,
                })
                .unwrap_or(None);

            let enum_variants = enum_variants
                .map(|v| format!(" enum{{ {} }}", v.join(", ")))
                .unwrap_or("".to_string());

            write!(
                f,
                "{}: {}{} #{}{enum_variants}",
                self.label,
                name,
                title.map(|t| format!(" '{t}'")).unwrap_or("".to_string()),
                self.type_id.0
            )?;
            Ok(())
        }

        fn children(&self) -> Cow<[Self::Child]> {
            let type_def = match self.type_id.as_type().unwrap() {
                Type::Def(type_def) => type_def,
                Type::Ref(type_ref) => {
                    let flat = type_ref.flatten();
                    match flat.target {
                        FlatTypeRefTarget::Indirect(_) => return Cow::Owned(vec![]),
                        FlatTypeRefTarget::Direct(d) => d,
                    }
                }
            };

            if self
                .parents
                .iter()
                .any(|&parent_id| parent_id == type_def.id())
            {
                Cow::Owned(vec![])
            } else {
                let parents = {
                    let mut p = (*self.parents).clone();
                    p.push(type_def.id());
                    Rc::new(p)
                };

                match type_def {
                    TypeDef::Integer(_)
                    | TypeDef::Float(_)
                    | TypeDef::String(_)
                    | TypeDef::File(_)
                    | TypeDef::Boolean(_) => Cow::Owned(vec![]),
                    TypeDef::Struct(ty) => {
                        let mut children = ty
                            .data
                            .props
                            .iter()
                            .map(|(k, id)| Node {
                                label: format!("[{k}]"),
                                type_id: id.into(),
                                parents: Rc::clone(&parents),
                            })
                            .collect::<Vec<_>>();
                        children.sort_unstable_by_key(|n| n.label.clone());

                        Cow::Owned(children)
                    }
                    TypeDef::Func(ty) => Cow::Owned(vec![
                        Node {
                            label: "input".to_string(),
                            type_id: ty.data.inp.into(),
                            parents: Rc::clone(&parents),
                        },
                        Node {
                            label: "output".to_string(),
                            type_id: ty.data.out.into(),
                            parents,
                        },
                    ]),
                    TypeDef::List(ty) => Cow::Owned(vec![Node {
                        label: "item".to_string(),
                        type_id: ty.data.of.into(),
                        parents,
                    }]),
                    TypeDef::Optional(ty) => Cow::Owned(vec![Node {
                        label: "item".to_string(),
                        type_id: ty.data.of.into(),
                        parents,
                    }]),
                    TypeDef::Union(ty) => Cow::Owned(
                        ty.data
                            .variants
                            .iter()
                            .enumerate()
                            .map(|(i, id)| Node {
                                label: format!("variant_{}", i),
                                type_id: (*id).into(),
                                parents: Rc::clone(&parents),
                            })
                            .collect(),
                    ),
                    TypeDef::Either(ty) => Cow::Owned(
                        ty.data
                            .variants
                            .iter()
                            .enumerate()
                            .map(|(i, id)| Node {
                                label: format!("variant_{}", i),
                                type_id: (*id).into(),
                                parents: Rc::clone(&parents),
                            })
                            .collect(),
                    ),
                }
            }
        }
    }
}
