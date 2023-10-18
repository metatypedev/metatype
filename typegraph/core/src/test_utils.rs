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
            .propx("posts", t::arrayx(t::proxy("Post"))?)?
            .named("User")
            .build()?;

        let post = t::struct_()
            .prop(
                "id",
                t::integer().as_id(true).config("auto", "true").build()?,
            )
            .prop("title", t::string().build()?)
            .prop("author", t::proxy("User").build()?)
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

    use crate::types::{Type, TypeFun, TypeId};

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
                Type::Proxy(p) => (format!("&{}", p.data.name), None),
                _ => (
                    ty.get_data().variant_name(),
                    ty.get_base().and_then(|b| b.name.clone()),
                ),
            };

            let enum_variants: Option<Vec<String>> = match ty {
                Type::Integer(typ) => typ
                    .data
                    .enumeration
                    .clone()
                    .map(|v| v.iter().map(|v| v.to_string()).collect()),
                Type::Float(typ) => typ
                    .data
                    .enumeration
                    .clone()
                    .map(|v| v.iter().map(|v| v.to_string()).collect()),
                Type::String(typ) => typ
                    .data
                    .enumeration
                    .clone()
                    .map(|v| v.iter().map(|v| format!("'{v}'")).collect()),
                _ => None,
            };

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

                match self.type_id.as_type().unwrap() {
                    Type::Proxy(_)
                    | Type::Integer(_)
                    | Type::Float(_)
                    | Type::String(_)
                    | Type::File(_)
                    | Type::Boolean(_) => Cow::Owned(vec![]),
                    Type::Struct(ty) => Cow::Owned(
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
                    Type::Func(ty) => Cow::Owned(vec![
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
                    Type::Array(ty) => Cow::Owned(vec![Node {
                        label: "item".to_string(),
                        type_id: ty.data.of.into(),
                        parents,
                    }]),
                    Type::Optional(ty) => Cow::Owned(vec![Node {
                        label: "item".to_string(),
                        type_id: ty.data.of.into(),
                        parents,
                    }]),
                    Type::Union(ty) => Cow::Owned(
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
                    Type::Either(ty) => Cow::Owned(
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
                    Type::WithPolicy(ty) => Cow::Owned(vec![Node {
                        label: "item".to_string(),
                        type_id: ty.data.tpe.into(),
                        parents,
                    }]),
                    Type::WithInjection(ty) => Cow::Owned(vec![Node {
                        label: "item".to_string(),
                        type_id: ty.data.tpe.into(),
                        parents,
                    }]),
                }
            }
        }
    }
}
