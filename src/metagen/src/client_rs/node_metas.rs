// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{cell::RefCell, fmt::Write};

use typegraph::{conv::TypeKey, FunctionType, ObjectType, TypeNodeExt as _, UnionType};

use super::{
    shared::manifest::{ManifestPage, TypeRenderer},
    utils::normalize_type_title,
};
use crate::interlude::*;

#[derive(Debug)]
pub enum RsNodeMeta {
    Scalar,
    Alias { target: TypeKey },
    Object(Object),
    Union(Union),
    Function(Function),
}

#[derive(Debug)]
pub struct Object {
    props: IndexMap<Arc<str>, TypeKey>,
    name: String,
}

#[derive(Debug)]
pub struct Union {
    variants: IndexMap<Arc<str>, TypeKey>,
    name: String,
}

#[derive(Debug)]
pub struct Function {
    name: String,
    return_ty: TypeKey,
    argument_fields: Option<BTreeMap<Arc<str>, Arc<str>>>,
    input_files: Option<String>,
}

type Context = ();

impl TypeRenderer for RsNodeMeta {
    type Context = Context;
    fn render(
        &self,
        out: &mut impl Write,
        page: &ManifestPage<Self>,
        ctx: &Self::Context,
    ) -> std::fmt::Result {
        match self {
            Self::Alias { .. } | Self::Scalar => {}
            Self::Object(obj) => {
                obj.render(page, ctx, out)?;
            }
            Self::Union(union) => {
                union.render(page, ctx, out)?;
            }
            Self::Function(func) => {
                func.render(page, ctx, out)?;
            }
        }

        Ok(())
    }

    fn get_reference_expr(&self, page: &ManifestPage<Self>, ctx: &Self::Context) -> Option<String> {
        match self {
            Self::Alias { target } => page.get_ref(target, ctx),
            Self::Scalar => Some("scalar".to_string()),
            Self::Object(obj) => Some(obj.name.clone()),
            Self::Union(union) => Some(union.name.clone()),
            Self::Function(func) => Some(func.name.clone()),
        }
    }
}

impl Object {
    pub fn render(
        &self,
        page: &ManifestPage<RsNodeMeta>,
        ctx: &Context,
        dest: &mut impl Write,
    ) -> std::fmt::Result {
        let ty_name = &self.name;
        write!(
            dest,
            r#"
pub fn {ty_name}() -> NodeMeta {{
    NodeMeta {{
        arg_types: None,
        variants: None,
        sub_nodes: Some(
            ["#
        )?;
        for (key, prop) in self.props.iter() {
            let node_ref = page.get_ref(&prop, ctx).unwrap();
            write!(
                dest,
                r#"
                ("{key}".into(), {node_ref} as NodeMetaFn),"#
            )?;
        }
        write!(
            dest,
            r#"
            ].into()
        ),
        input_files: None,
    }}
}}"#
        )?;
        Ok(())
    }
}

impl Union {
    pub fn render(
        &self,
        page: &ManifestPage<RsNodeMeta>,
        ctx: &Context,
        dest: &mut impl Write,
    ) -> std::fmt::Result {
        let ty_name = &self.name;
        write!(
            dest,
            r#"
pub fn {ty_name}() -> NodeMeta {{
    NodeMeta {{
        arg_types: None,
        sub_nodes: None,
        variants: Some(
            ["#
        )?;
        for (key, prop) in &self.variants {
            let node_ref = page.get_ref(prop, ctx).unwrap();
            write!(
                dest,
                r#"
                ("{key}".into(), {node_ref} as NodeMetaFn),"#
            )?;
        }
        write!(
            dest,
            r#"
            ].into()
        ),
        input_files: None,
    }}
}}"#
        )?;
        Ok(())
    }
}

impl Function {
    pub fn render(
        &self,
        page: &ManifestPage<RsNodeMeta>,
        ctx: &Context,
        dest: &mut impl Write,
    ) -> std::fmt::Result {
        let ty_name = &self.name;
        write!(
            dest,
            r#"
pub fn {ty_name}() -> NodeMeta {{
    NodeMeta {{"#
        )?;
        if let Some(fields) = &self.argument_fields {
            write!(
                dest,
                r#"
        arg_types: Some(
            ["#
            )?;

            for (key, ty) in fields {
                write!(
                    dest,
                    r#"
                ("{key}".into(), "{ty}".into()),"#
                )?;
            }

            write!(
                dest,
                r#"
            ].into()
        ),"#
            )?;
        }
        if let Some(input_files) = &self.input_files {
            write!(
                dest,
                r#"
        input_files: Some(PathToInputFiles(&{input_files})),"#
            )?;
        }
        let return_node = page.get_ref(&self.return_ty, ctx).unwrap();
        write!(
            dest,
            r#"
        ..{return_node}()
    }}
}}"#
        )?;
        Ok(())
    }
}

pub struct PageBuilder {
    tg: Arc<Typegraph>,
    stack: RefCell<Vec<TypeKey>>,
}

impl PageBuilder {
    pub fn new(tg: Arc<Typegraph>, metas: &IndexSet<TypeKey>) -> Self {
        Self {
            tg,
            stack: RefCell::new(metas.iter().copied().collect()),
        }
    }

    fn push(&self, key: TypeKey) {
        self.stack.borrow_mut().push(key);
    }

    pub fn build(self) -> Result<ManifestPage<RsNodeMeta>> {
        let mut map = IndexMap::new();

        loop {
            let next = {
                let mut stack = self.stack.borrow_mut();
                stack.pop()
            };

            if let Some(key) = next {
                if map.contains_key(&key) {
                    continue;
                }
                map.insert(key, self.get_spec(key)?);
            } else {
                break;
            }
        }

        Ok(map.into())
    }

    fn get_spec(&self, key: TypeKey) -> Result<RsNodeMeta> {
        let ty = self.tg.find_type(key).unwrap();
        debug_assert_eq!(ty.key(), key);
        match ty {
            Type::Boolean(_)
            | Type::Float(_)
            | Type::Integer(_)
            | Type::String(_)
            | Type::File(_) => Ok(RsNodeMeta::Scalar),
            Type::Optional(ty) => Ok(self.alias(ty.item()?.key())),
            Type::List(ty) => Ok(self.alias(ty.item()?.key())),
            Type::Union(ty) => self.get_union_spec(ty.clone()),
            Type::Function(ty) => self.get_func_spec(key, ty.clone()),
            Type::Object(ty) => self.get_object_spec(key, ty.clone()),
        }
    }

    fn alias(&self, key: TypeKey) -> RsNodeMeta {
        self.push(key);
        RsNodeMeta::Alias { target: key }
    }

    fn get_func_spec(&self, key: TypeKey, ty: Arc<FunctionType>) -> Result<RsNodeMeta> {
        debug_assert_eq!(ty.key(), key);
        let out_key = ty.output()?.key();
        self.push(out_key);

        let props = ty.input()?.properties()?;
        let props = if !props.is_empty() {
            let mut res = BTreeMap::new();
            for (name, prop) in props.iter() {
                res.insert(name.clone(), prop.type_.name()?);
            }
            Some(res)
        } else {
            None
        };

        // TODO input_files

        Ok(RsNodeMeta::Function(Function {
            return_ty: out_key,
            argument_fields: props,
            input_files: None,
            name: normalize_type_title(&ty.name().unwrap()),
        }))
    }

    // TODO return result
    fn get_union_spec(&self, ty: Arc<UnionType>) -> Result<RsNodeMeta> {
        let mut variants = IndexMap::new();
        for variant in ty.variants()?.iter() {
            if variant.is_composite()? {
                let key = variant.key();
                self.push(key);
                variants.insert(variant.name()?, key);
            }
        }
        Ok(if !variants.is_empty() {
            let name = normalize_type_title(&ty.name().unwrap());
            // TODO named_types???
            RsNodeMeta::Union(Union { variants, name })
        } else {
            RsNodeMeta::Scalar
        })
    }

    fn get_object_spec(&self, key: TypeKey, ty: Arc<ObjectType>) -> Result<RsNodeMeta> {
        debug_assert_eq!(ty.key(), key);
        let props = ty.properties()?;
        let props = props
            .iter()
            .map(|(name, prop)| {
                let prop_key = prop.type_.key();
                self.push(prop_key);
                (name.clone(), prop_key)
            })
            .collect::<IndexMap<_, _>>();

        Ok(RsNodeMeta::Object(Object {
            props,
            name: normalize_type_title(&ty.name()?),
        }))
    }
}
