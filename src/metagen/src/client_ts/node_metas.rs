// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::Write;

use heck::ToPascalCase as _;
use typegraph::{conv::TypeKey, FunctionType, ObjectType, TypeNodeExt as _, UnionType};

use super::{
    shared::{
        manifest::{ManifestPage, TypeRenderer},
        node_metas::*,
    },
    utils::normalize_type_title,
};
use crate::{interlude::*, shared::types::*};

impl TypeRenderer for TsNodeMeta {
    fn render(
        &self,
        dest: &mut impl Write,
        page: &ManifestPage<Self>,
        memo: &impl NameMemo,
    ) -> std::fmt::Result {
        match self {
            Self::Scalar => {}
            Self::Alias { .. } => {}
            Self::Object(obj) => obj.render(dest, page, memo)?,
            Self::Function(func) => func.render(dest, page, memo)?,
            Self::Union(union) => union.render(dest, page, memo)?,
        }

        Ok(())
    }

    fn get_reference_expr(
        &self,
        page: &ManifestPage<Self>,
        memo: &impl NameMemo,
    ) -> Option<String> {
        match self {
            Self::Scalar => Some("scalar".to_string()),
            Self::Alias { target } => page.get_ref(target, memo),
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
        memo: &impl NameMemo,
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
            let node_ref = page.get_ref(prop_ty, memo).unwrap();

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
        memo: &impl NameMemo,
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
            let node_ref = page.get_ref(variant_key, memo).unwrap();
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
        memo: &impl NameMemo,
    ) -> std::fmt::Result {
        let name = &self.name;
        let return_name = page.get_ref(&self.return_ty, memo).unwrap();
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
                let ty = page.get_ref(ty, memo).unwrap();
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
    fn build_meta(&self, key: TypeKey) -> Result<TsNodeMeta> {
        let ty = self.tg.find_type(key).unwrap();

        match ty {
            Type::Boolean(_)
            | Type::Float(_)
            | Type::Integer(_)
            | Type::String(_)
            | Type::File(_) => Ok(TsNodeMeta::Scalar),
            Type::Optional(ty) => Ok(self.alias(ty.item()?.key())),
            Type::List(ty) => Ok(self.alias(ty.item()?.key())),
            Type::Union(ty) => self.build_union(ty.clone()),
            Type::Function(ty) => self.build_func(ty.clone()),
            Type::Object(ty) => self.build_object(ty.clone()),
        }
    }
}

trait TsMetasPageBuilderExt {
    fn alias(&self, key: TypeKey) -> TsNodeMeta;
    fn build_object(&self, ty: Arc<ObjectType>) -> Result<TsNodeMeta>;
    fn build_union(&self, ty: Arc<UnionType>) -> Result<TsNodeMeta>;
    fn build_func(&self, ty: Arc<FunctionType>) -> Result<TsNodeMeta>;
}

impl TsMetasPageBuilderExt for MetasPageBuilder {
    fn alias(&self, key: TypeKey) -> TsNodeMeta {
        self.push(key);
        TsNodeMeta::Alias { target: key }
    }

    fn build_object(&self, ty: Arc<ObjectType>) -> Result<TsNodeMeta> {
        let props = ty.properties()?;
        let props = props
            .iter()
            .map(|(name, prop)| {
                let key = prop.type_.key();
                self.push(key);
                (name.clone(), key)
            })
            .collect::<IndexMap<_, _>>();

        Ok(TsNodeMeta::Object(Object {
            props,
            name: normalize_type_title(&ty.name().unwrap()).to_pascal_case(),
        }))
    }

    fn build_union(&self, ty: Arc<UnionType>) -> Result<TsNodeMeta> {
        let mut variants = vec![];
        for variant in ty.variants()?.iter() {
            let key = variant.key();
            // if variant.is_composite()? {
            self.push(key);
            // }
            variants.push(key);
        }
        let variants = variants
            .into_iter()
            .map(|key| -> Result<_> {
                let ty = self.tg.find_type(key).unwrap();
                Ok((ty.name()?, key))
            })
            .collect::<Result<IndexMap<_, _>>>()?;

        Ok(TsNodeMeta::Union(Union {
            name: normalize_type_title(&ty.name().unwrap()),
            variants,
        }))
    }

    fn build_func(&self, ty: Arc<FunctionType>) -> Result<TsNodeMeta> {
        let out_key = ty.output()?.key();
        self.push(out_key);

        let props = ty.input()?.properties()?;
        let props = (!props.is_empty()).then(|| {
            props
                .iter()
                .map(|(name, prop)| (name.clone(), prop.type_.key()))
                .collect::<IndexMap<_, _>>()
        });

        // TODO input_files

        Ok(TsNodeMeta::Function(Function {
            return_ty: out_key,
            argument_fields: props,
            input_files: None,
            name: normalize_type_title(&ty.name().unwrap()),
        }))
    }
}
