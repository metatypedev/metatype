// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::Write;

use heck::ToPascalCase as _;
use typegraph::TypeNodeExt as _;

use super::{
    shared::{
        manifest::{ManifestEntry, ManifestPage},
        node_metas::{MetaFactory, MetasPageBuilder},
    },
    utils::normalize_type_title,
};
use crate::{
    interlude::*,
    shared::files::{get_path_to_files, serialize_typepaths_json},
};

pub type PyNodeMetasPage = ManifestPage<PyNodeMeta>;

#[derive(Debug)]
pub enum PyNodeMeta {
    Alias { target: TypeKey },
    Scalar,
    Object(Object),
    Union(Union),
    Function(Function),
}

#[derive(Debug)]
pub struct Object {
    name: String,
    props: IndexMap<Arc<str>, TypeKey>,
}

impl Object {
    fn render(&self, dest: &mut impl Write, page: &ManifestPage<PyNodeMeta>) -> std::fmt::Result {
        let ty_name = &self.name;
        write!(
            dest,
            r#"
    @staticmethod
    def {ty_name}():
        return NodeMeta(
            sub_nodes={{"#
        )?;
        for (prop_key, ty_key) in self.props.iter() {
            let ty_ref = page.get_ref(ty_key).unwrap();
            write!(
                dest,
                r#"
                "{prop_key}": NodeDescs.{ty_ref},"#
            )?;
        }
        write!(
            dest,
            r#"
            }},
        )
"#
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
    fn render(&self, dest: &mut impl Write, page: &ManifestPage<PyNodeMeta>) -> std::fmt::Result {
        let name = &self.name;
        write!(
            dest,
            r#"
    @staticmethod
    def {name}():
        return NodeMeta(
            variants={{"#
        )?;
        for (key, variant_ty) in &self.variants {
            let variant_ref = page.get_ref(variant_ty).unwrap();
            write!(
                dest,
                r#"
                "{key}": NodeDescs.{variant_ref},"#
            )?;
        }
        write!(
            dest,
            r#"
            }},
        )
"#
        )?;
        Ok(())
    }
}

#[derive(Debug)]
pub struct Function {
    name: String,
    return_ty: TypeKey,
    args: Option<BTreeMap<Arc<str>, Arc<str>>>,
    input_files: Option<String>,
}

impl Function {
    fn render(&self, dest: &mut impl Write, page: &PyNodeMetasPage) -> std::fmt::Result {
        let name = &self.name;
        let return_name = page.get_ref(&self.return_ty).unwrap();
        write!(
            dest,
            r#"
    @staticmethod
    def {name}():
        return_node = NodeDescs.{return_name}()
        return NodeMeta(
            sub_nodes=return_node.sub_nodes,
            variants=return_node.variants,"#
        )?;
        if let Some(fields) = &self.args {
            write!(
                dest,
                r#"
            arg_types={{"#
            )?;

            for (key, ty) in fields {
                write!(
                    dest,
                    r#"
                "{key}": "{ty}","#
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
            input_files={input_files},"#
            )?;
        }
        write!(
            dest,
            r#"
        )
"#
        )?;
        Ok(())
    }
}

impl ManifestEntry for PyNodeMeta {
    type Extras = ();

    fn render(&self, dest: &mut impl Write, page: &ManifestPage<Self>) -> std::fmt::Result {
        match self {
            PyNodeMeta::Alias { .. } => Ok(()),
            PyNodeMeta::Scalar => Ok(()),
            PyNodeMeta::Object(obj) => obj.render(dest, page),
            PyNodeMeta::Union(union) => union.render(dest, page),
            PyNodeMeta::Function(func) => func.render(dest, page),
        }
    }

    fn get_reference_expr(&self, page: &ManifestPage<Self>) -> Option<String> {
        Some(match self {
            PyNodeMeta::Alias { target } => page.get_ref(target).unwrap(),
            PyNodeMeta::Scalar => "scalar".to_string(),
            PyNodeMeta::Object(obj) => obj.name.clone(),
            PyNodeMeta::Union(union) => union.name.clone(),
            PyNodeMeta::Function(func) => func.name.clone(),
        })
    }
}

impl MetaFactory<PyNodeMeta> for MetasPageBuilder {
    fn build_meta(&self, ty: Type) -> PyNodeMeta {
        match ty {
            Type::Boolean(_)
            | Type::Integer(_)
            | Type::Float(_)
            | Type::String(_)
            | Type::File(_) => PyNodeMeta::Scalar,
            Type::Optional(ty) => self.alias(ty.item().clone()),
            Type::List(ty) => self.alias(ty.item().clone()),
            Type::Object(ty) => self.build_object(ty),
            Type::Union(ty) => self.build_union(ty),
            Type::Function(ty) => self.build_func(ty),
        }
    }
}

trait PyMetasExt {
    fn alias(&self, ty: Type) -> PyNodeMeta;
    fn build_object(&self, ty: Arc<ObjectType>) -> PyNodeMeta;
    fn build_union(&self, ty: Arc<UnionType>) -> PyNodeMeta;
    fn build_func(&self, ty: Arc<FunctionType>) -> PyNodeMeta;
}

impl PyMetasExt for MetasPageBuilder {
    fn alias(&self, ty: Type) -> PyNodeMeta {
        let key = ty.key();
        self.push(ty);
        PyNodeMeta::Alias { target: key }
    }

    fn build_object(&self, ty: Arc<ObjectType>) -> PyNodeMeta {
        let props = ty.properties();
        let props = props
            .iter()
            .map(|(name, prop)| {
                self.push(prop.ty.clone());
                (name.clone(), prop.ty.key())
            })
            .collect::<IndexMap<_, _>>();

        PyNodeMeta::Object(Object {
            name: normalize_type_title(&ty.name()).to_pascal_case(),
            props,
        })
    }

    fn build_union(&self, ty: Arc<UnionType>) -> PyNodeMeta {
        let variants = ty.variants();
        let variants = variants
            .iter()
            .filter_map(|v| {
                self.push(v.clone());
                v.is_composite().then(|| (v.name(), v.key()))
            })
            .collect::<IndexMap<_, _>>();

        if !variants.is_empty() {
            PyNodeMeta::Union(Union {
                name: normalize_type_title(&ty.name()).to_pascal_case(),
                variants,
            })
        } else {
            PyNodeMeta::Scalar
        }
    }

    fn build_func(&self, ty: Arc<FunctionType>) -> PyNodeMeta {
        let out = ty.output();
        let out_key = out.key();
        self.push(out.clone());
        let props = ty.input().properties();
        let args = (!props.is_empty()).then(|| {
            props
                .iter()
                .map(|(name, prop)| (name.clone(), prop.ty.name()))
                .collect()
        });

        let input_files = get_path_to_files(ty.clone());

        PyNodeMeta::Function(Function {
            return_ty: out_key,
            args,
            input_files: serialize_typepaths_json(&input_files),
            name: normalize_type_title(&ty.name()).to_pascal_case(),
        })
    }
}
