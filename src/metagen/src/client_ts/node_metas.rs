// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::Write;

use heck::ToPascalCase as _;
use typegraph::{FunctionType, ObjectType, TypeNodeExt as _, UnionType};

use super::{
    shared::{
        files::{get_path_to_files_2, serialize_typepaths_json},
        manifest::{ManifestPage, TypeRenderer},
        node_metas::*,
    },
    utils::normalize_type_title,
};
use crate::interlude::*;

type Context = ();

impl TypeRenderer for TsNodeMeta {
    type Context = Context;

    fn render(
        &self,
        dest: &mut impl Write,
        page: &ManifestPage<Self>,
        ctx: &Context,
    ) -> std::fmt::Result {
        match self {
            Self::Scalar => {}
            Self::Alias { .. } => {}
            Self::Object(obj) => obj.render(dest, page, ctx)?,
            Self::Function(func) => func.render(dest, page, ctx)?,
            Self::Union(union) => union.render(dest, page, ctx)?,
        }

        Ok(())
    }

    fn get_reference_expr(&self, page: &ManifestPage<Self>, ctx: &Context) -> Option<String> {
        match self {
            Self::Scalar => Some("scalar".to_string()),
            Self::Alias { target } => page.get_ref(target, ctx),
            Self::Object(obj) => Some(obj.name.clone()),
            Self::Function(func) => Some(func.name.clone()),
            Self::Union(union) => Some(union.name.clone()),
        }
    }
}

#[derive(Debug)]
pub struct Object {
    props: IndexMap<Arc<str>, TypeKey>,
    name: String,
}

impl Object {
    fn render(
        &self,
        dest: &mut impl Write,
        page: &ManifestPage<TsNodeMeta>,
        ctx: &Context,
    ) -> std::fmt::Result {
        let name = &self.name;
        let props = &self.props;
        write!(
            dest,
            r#"
  {name}(): NodeMeta {{
    return {{
      subNodes: ["#
        )?;
        for (prop_name, prop_ty) in props {
            let node_ref = page.get_ref(prop_ty, ctx).unwrap();

            write!(
                dest,
                r#"
        ["{prop_name}", nodeMetas.{node_ref}],"#
            )?;
        }
        write!(
            dest,
            r#"
      ],
    }};
  }},"#
        )?;
        Ok(())
    }
}

#[derive(Debug)]
pub struct Union {
    name: String,
    variants: IndexMap<Arc<str>, TypeKey>,
}

impl Union {
    fn render(
        &self,
        dest: &mut impl Write,
        page: &ManifestPage<TsNodeMeta>,
        ctx: &Context,
    ) -> std::fmt::Result {
        let name = &self.name;
        let variants = &self.variants;
        write!(
            dest,
            r#"
  {name}(): NodeMeta {{
    return {{
      variants: ["#
        )?;
        for (variant_name, variant_key) in variants {
            let node_ref = page.get_ref(variant_key, ctx).unwrap();
            write!(
                dest,
                r#"
        ["{variant_name}", nodeMetas.{node_ref}],"#
            )?;
        }
        write!(
            dest,
            r#"
      ],
    }};
  }},"#
        )?;
        Ok(())
    }
}

#[derive(Debug)]
pub struct Function {
    return_ty: TypeKey,
    argument_fields: Option<IndexMap<Arc<str>, TypeKey>>,
    input_files: Option<String>, // WTF
    name: String,
}

impl Function {
    fn render(
        &self,
        dest: &mut impl Write,
        page: &ManifestPage<TsNodeMeta>,
        ctx: &Context,
    ) -> std::fmt::Result {
        let name = &self.name;
        let return_name = page.get_ref(&self.return_ty, ctx).unwrap();
        write!(
            dest,
            r#"
  {name}(): NodeMeta {{
    return {{
      ...nodeMetas.{return_name}(),"#
        )?;
        if let Some(fields) = &self.argument_fields {
            write!(
                dest,
                r#"
      argumentTypes: {{"#
            )?;

            for (key, ty) in fields {
                // huh?
                let ty = page.get_ref(ty, ctx).unwrap();
                write!(
                    dest,
                    r#"
        {key}: "{ty}","#
                )?;
            }

            write!(
                dest,
                r#"
      }},"#
            )?;
        }
        if let Some(input_files) = &self.input_files {
            write!(
                dest,
                r#"
      inputFiles: {input_files},"#
            )?;
        }
        write!(
            dest,
            r#"
    }};
  }},"#
        )?;
        Ok(())
    }
}

#[derive(Debug)]
pub enum TsNodeMeta {
    Scalar,
    Alias { target: TypeKey },
    Object(Object),
    Union(Union),
    Function(Function),
}

impl MetaFactory<TsNodeMeta> for MetasPageBuilder {
    fn build_meta(&self, key: TypeKey) -> TsNodeMeta {
        let ty = self.tg.find_type(key).unwrap();

        match ty {
            Type::Boolean(_)
            | Type::Float(_)
            | Type::Integer(_)
            | Type::String(_)
            | Type::File(_) => TsNodeMeta::Scalar,
            Type::Optional(ty) => self.alias(ty.item().key()),
            Type::List(ty) => self.alias(ty.item().key()),
            Type::Object(ty) => self.build_object(ty.clone()),
            Type::Union(ty) => self.build_union(ty.clone()),
            Type::Function(ty) => self.build_func(ty.clone()),
        }
    }
}

trait TsMetasPageBuilderExt {
    fn alias(&self, key: TypeKey) -> TsNodeMeta;
    fn build_object(&self, ty: Arc<ObjectType>) -> TsNodeMeta;
    fn build_union(&self, ty: Arc<UnionType>) -> TsNodeMeta;
    fn build_func(&self, ty: Arc<FunctionType>) -> TsNodeMeta;
}

impl TsMetasPageBuilderExt for MetasPageBuilder {
    fn alias(&self, key: TypeKey) -> TsNodeMeta {
        self.push(key);
        TsNodeMeta::Alias { target: key }
    }

    fn build_object(&self, ty: Arc<ObjectType>) -> TsNodeMeta {
        let props = ty.properties();
        let props = props
            .iter()
            .map(|(name, prop)| {
                let key = prop.type_.key();
                self.push(key);
                (name.clone(), key)
            })
            .collect::<IndexMap<_, _>>();

        TsNodeMeta::Object(Object {
            props,
            name: normalize_type_title(&ty.name()).to_pascal_case(),
        })
    }

    fn build_union(&self, ty: Arc<UnionType>) -> TsNodeMeta {
        let mut variants = IndexMap::new();
        for variant in ty.variants().iter() {
            if variant.is_composite() {
                let key = variant.key();
                self.push(key);
                variants.insert(variant.name(), key);
            }
        }
        if variants.is_empty() {
            TsNodeMeta::Scalar
        } else {
            let name = normalize_type_title(&ty.name());
            TsNodeMeta::Union(Union { name, variants })
        }
    }

    fn build_func(&self, ty: Arc<FunctionType>) -> TsNodeMeta {
        let out_key = ty.output().key();
        self.push(out_key);

        let props = ty.input().properties();
        let props = (!props.is_empty()).then(|| {
            props
                .iter()
                .map(|(name, prop)| (name.clone(), prop.type_.key()))
                .collect::<IndexMap<_, _>>()
        });

        let input_files = get_path_to_files_2(ty.clone());

        TsNodeMeta::Function(Function {
            return_ty: out_key,
            argument_fields: props,
            input_files: serialize_typepaths_json(&input_files),
            name: normalize_type_title(&ty.name()),
        })
    }
}
