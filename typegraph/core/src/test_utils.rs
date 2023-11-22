// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub(crate) use crate::wit::runtimes::{Effect, MaterializerDenoFunc};

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
    use crate::errors::Result;
    use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
    use crate::types::TypeId;

    pub fn simple_record() -> Result<TypeId> {
        t::struct_()
            .named("Record")
            .prop(
                "id",
                t::string()
                    .as_id(true)
                    .format("uuid")
                    .config("auto", "true")
                    .build()?,
            )
            .prop("name", t::string().build()?)
            .prop("age", t::optional(t::integer().build()?).build()?)
            .build()
    }

    pub fn simple_relationship() -> Result<(TypeId, TypeId)> {
        let user = t::struct_()
            .prop("id", t::integer().as_id(true).build()?)
            .propx("name", t::string())?
            .propx("posts", t::listx(t::ref_("Post"))?)?
            .named("User")
            .build()?;

        let post = t::struct_()
            .prop(
                "id",
                t::integer().as_id(true).config("auto", "true").build()?,
            )
            .prop("title", t::string().build()?)
            .prop("author", t::ref_("User").build()?)
            .named("Post")
            .build()?;

        Ok((user, post))
    }
}

pub fn setup(name: Option<&str>) -> crate::errors::Result<()> {
    use crate::wit::core::Guest;

    crate::Lib::init_typegraph(crate::wit::core::TypegraphInitParams {
        name: name
            .map(|n| n.to_string())
            .unwrap_or_else(|| "test".to_string()),
        path: ".".to_string(),
        ..Default::default()
    })
}

pub mod tree {
    use std::{borrow::Cow, io::Write, rc::Rc};

    use ptree::{Style, TreeItem};

    use crate::types::{Type, TypeDef, TypeDefExt, TypeId};

    #[derive(Clone)]
    struct Node {
        label: String,
        type_id: TypeId,
        parents: Rc<Vec<TypeId>>,
    }

    pub fn print(type_id: TypeId) -> String {
        let root = Node {
            label: "root".into(),
            type_id,
            parents: Rc::new(vec![]),
        };

        let mut buf: Vec<u8> = vec![];
        ptree::write_tree(&root, &mut buf).expect("could not write tree");

        String::from_utf8(buf).unwrap()
    }

    impl TreeItem for Node {
        type Child = Self;

        fn write_self<W: Write>(&self, f: &mut W, _style: &Style) -> std::io::Result<()> {
            let ty = self.type_id.as_type().unwrap();
            let (name, title) = match &ty {
                Type::Ref(p) => (format!("&{}", p.name), None),
                Type::Def(def) => (
                    def.data().variant_name().to_owned(),
                    def.base().name.clone(),
                ),
            };

            let enum_variants: Option<Vec<String>> = self
                .type_id
                .as_type_def()
                .unwrap()
                .map(|type_def| match type_def {
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
                .flatten();

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
            if self
                .parents
                .iter()
                .any(|&parent_id| parent_id == self.type_id)
            {
                Cow::Owned(vec![])
            } else {
                let parents = {
                    let mut p = (*self.parents).clone();
                    p.push(self.type_id);
                    Rc::new(p)
                };

                let Type::Def(type_def) = self.type_id.as_type().unwrap() else {
                    return Cow::Owned(vec![]);
                };

                match type_def {
                    TypeDef::Integer(_)
                    | TypeDef::Float(_)
                    | TypeDef::String(_)
                    | TypeDef::File(_)
                    | TypeDef::Boolean(_) => Cow::Owned(vec![]),
                    TypeDef::Struct(ty) => Cow::Owned(
                        ty.data
                            .props
                            .iter()
                            .map(|(k, id)| Node {
                                label: format!("[{k}]"),
                                type_id: (*id).into(),
                                parents: Rc::clone(&parents),
                            })
                            .collect(),
                    ),
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
