// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::Write;

use typegraph::{conv::TypeKey, FunctionType, ObjectType, TypeNodeExt as _, UnionType};

use super::shared::manifest::{ManifestPage, TypeRenderer};
use super::shared::node_metas::{MetaFactory, MetasPageBuilder};
use super::utils::normalize_type_title;
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

impl MetaFactory<RsNodeMeta> for MetasPageBuilder {
    fn build_meta(&self, key: TypeKey) -> RsNodeMeta {
        let ty = self.tg.find_type(key).unwrap();
        debug_assert_eq!(ty.key(), key);
        match ty {
            Type::Boolean(_)
            | Type::Float(_)
            | Type::Integer(_)
            | Type::String(_)
            | Type::File(_) => RsNodeMeta::Scalar,
            Type::Optional(ty) => self.alias(ty.item().key()),
            Type::List(ty) => self.alias(ty.item().key()),
            Type::Union(ty) => self.build_union(ty.clone()),
            Type::Function(ty) => self.build_func(ty.clone()),
            Type::Object(ty) => self.build_object(ty.clone()),
        }
    }
}

trait RsMetasExt {
    fn alias(&self, key: TypeKey) -> RsNodeMeta;
    fn build_func(&self, ty: Arc<FunctionType>) -> RsNodeMeta;
    fn build_object(&self, ty: Arc<ObjectType>) -> RsNodeMeta;
    fn build_union(&self, ty: Arc<UnionType>) -> RsNodeMeta;
}

impl RsMetasExt for MetasPageBuilder {
    fn alias(&self, key: TypeKey) -> RsNodeMeta {
        self.push(key);
        RsNodeMeta::Alias { target: key }
    }

    fn build_object(&self, ty: Arc<ObjectType>) -> RsNodeMeta {
        let props = ty.properties();
        let props = props
            .iter()
            .map(|(name, prop)| {
                let prop_key = prop.type_.key();
                self.push(prop_key);
                (name.clone(), prop_key)
            })
            .collect::<IndexMap<_, _>>();

        RsNodeMeta::Object(Object {
            props,
            name: normalize_type_title(&ty.name()),
        })
    }

    fn build_union(&self, ty: Arc<UnionType>) -> RsNodeMeta {
        let mut variants = IndexMap::new();
        for variant in ty.variants().iter() {
            if variant.is_composite() {
                let key = variant.key();
                self.push(key);
                variants.insert(variant.name(), key);
            }
        }
        if !variants.is_empty() {
            let name = normalize_type_title(&ty.name());
            // TODO named_types???
            RsNodeMeta::Union(Union { variants, name })
        } else {
            RsNodeMeta::Scalar
        }
    }

    fn build_func(&self, ty: Arc<FunctionType>) -> RsNodeMeta {
        let out_key = ty.output().key();
        self.push(out_key);

        let props = ty.input().properties();
        let props = if !props.is_empty() {
            let mut res = BTreeMap::new();
            for (name, prop) in props.iter() {
                res.insert(name.clone(), prop.type_.name());
            }
            Some(res)
        } else {
            None
        };

        // TODO input_files

        RsNodeMeta::Function(Function {
            return_ty: out_key,
            argument_fields: props,
            input_files: None,
            name: normalize_type_title(&ty.name()),
        })
    }
}
