// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::global_store::with_store;
use crate::t::TypeBuilder;
use crate::types::TypeId;
pub(crate) use crate::wit::{
    core::{Core, TypeArray, TypeBase, TypeFloat, TypeFunc, TypeInteger, TypeOptional, TypeStruct},
    runtimes::{Effect, MaterializerDenoFunc, Runtimes},
};
pub(crate) use crate::Lib;
pub(crate) use crate::TypegraphInitParams;
use crate::{errors::Result, t};

#[derive(Default)]
pub struct PrismaLink {
    type_name: String,
    rel_name: Option<String>,
    fkey: Option<bool>,
}

impl PrismaLink {
    pub fn name(mut self, n: impl Into<String>) -> Self {
        self.rel_name = Some(n.into());
        self
    }

    pub fn fkey(mut self, fk: bool) -> Self {
        self.fkey = Some(fk);
        self
    }

    pub fn build(mut self) -> Result<TypeId> {
        let mut proxy = t::proxy(self.type_name);
        if let Some(rel_name) = self.rel_name.take() {
            proxy.ex("rel_name", rel_name);
        }
        if let Some(fkey) = self.fkey {
            proxy.ex("fkey", format!("{fkey}"));
        }
        let res = proxy.build()?;
        eprintln!("proxy: {:?}", res);
        Ok(res)
    }
}

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
        Self::None
    }
}

pub fn prisma_link(type_id: TypeId) -> Result<PrismaLink> {
    // TODO Lib::get_type_name
    let name = with_store(|s| -> Result<_> {
        s.get_type_name(type_id)?
            .map(|s| s.to_owned())
            .ok_or_else(|| "Prisma link target must be named".to_string())
    })?;
    Ok(prisma_linkn(name))
}

pub fn prisma_linkn(name: impl Into<String>) -> PrismaLink {
    PrismaLink {
        type_name: name.into(),
        ..Default::default()
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
            .prop("name", t::string().build()?)
            .prop("posts", t::array(t::proxy("Post").build()?).build()?)
            .named("User")
            .build()?;

        let post = t::struct_()
            .prop("id", t::integer().as_id(true).build()?)
            .prop("title", t::string().build()?)
            .prop("author", t::proxy("User").build()?)
            .named("Post")
            .build()?;

        Ok((user, post))
    }
}

pub mod tree {
    use std::{borrow::Cow, io::Write, rc::Rc};

    use ptree::{Style, TreeItem};

    use crate::{
        global_store::with_store,
        types::{Type, TypeFun, TypeId},
    };

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
            let (name, title) = with_store(|s| {
                let ty = s.get_type(self.type_id).unwrap();
                match ty {
                    Type::Proxy(p) => (format!("&{}", p.data.name), None),
                    _ => (
                        ty.get_data().variant_name(),
                        ty.get_base().map(|b| b.name.clone()).flatten(),
                    ),
                }
            });

            let enum_variants: Option<Vec<String>> = with_store(|s| {
                let ty = s.get_type(self.type_id).unwrap();
                match ty {
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
                }
            });

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
            with_store(|s| {
                let ty = s.get_type(self.type_id).unwrap();
                if self
                    .parents
                    .iter()
                    .find(|&&parent_id| parent_id == self.type_id)
                    .is_some()
                {
                    Cow::Owned(vec![])
                } else {
                    let parents = {
                        let mut p = (*self.parents).clone();
                        p.push(self.type_id);
                        Rc::new(p)
                    };

                    match s.get_type(self.type_id).unwrap() {
                        Type::Proxy(_)
                        | Type::Integer(_)
                        | Type::Float(_)
                        | Type::String(_)
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
                                parents: parents,
                            },
                        ]),
                        Type::Array(ty) => Cow::Owned(vec![Node {
                            label: "item".to_string(),
                            type_id: ty.data.of.into(),
                            parents: parents,
                        }]),
                        Type::Optional(ty) => Cow::Owned(vec![Node {
                            label: "item".to_string(),
                            type_id: ty.data.of.into(),
                            parents: parents,
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
                            parents: parents,
                        }]),
                    }
                }
            })
        }
    }
}
