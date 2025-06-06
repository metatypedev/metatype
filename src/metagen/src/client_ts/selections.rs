// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::Write;

use typegraph::TypeNodeExt as _;

use super::shared::manifest::{ManifestEntry, ManifestPage};
use super::utils::*;
use crate::{interlude::*, shared::client::*};

pub struct TsSelectionExtras {
    types_memo: Arc<IndexMap<TypeKey, String>>,
}

pub type TsSelectionManifestPage = ManifestPage<TsSelection, TsSelectionExtras>;

#[derive(Debug)]
pub enum TsSelection {
    Object(Object),
    Union(Union),
    Alias(TypeKey),
}

#[derive(Debug)]
pub struct Object {
    name: String,
    props: Vec<(String, SelectionTy)>,
}

impl Object {
    fn render(&self, dest: &mut impl Write, page: &TsSelectionManifestPage) -> std::fmt::Result {
        writeln!(
            dest,
            "export type {} = {{
  _?: SelectionFlags;",
            self.name,
        )?;
        for (name, select_ty) in &self.props {
            use SelectionTy::*;
            match select_ty {
                Scalar => writeln!(dest, r#"  {name}?: ScalarSelectNoArgs;"#)?,
                ScalarArgs { arg_ty } => {
                    // let arg_ty = page.get_ref(arg_ty).unwrap();
                    let arg_ty = page.extras.types_memo.get(arg_ty).unwrap();
                    writeln!(dest, r#"  {name}?: ScalarSelectArgs<{arg_ty}>;"#)?
                }
                Composite { select_ty } => {
                    let select_ty = page.get_ref(select_ty).unwrap();
                    writeln!(dest, r#"  {name}?: CompositeSelectNoArgs<{select_ty}>;"#)?
                }
                CompositeArgs { arg_ty, select_ty } => {
                    // let arg_ty = page.get_ref(arg_ty).unwrap();
                    let arg_ty = page.extras.types_memo.get(arg_ty).unwrap();
                    let select_ty = page.get_ref(select_ty).unwrap();
                    writeln!(
                        dest,
                        r#"  {name}?: CompositeSelectArgs<{arg_ty}, {select_ty}>;"#
                    )?
                }
            };
        }
        writeln!(dest, "}};")?;
        Ok(())
    }
}

#[derive(Debug)]
struct UnionVariant {
    ty: String,
    select_ty: SelectionTy,
}

#[derive(Debug)]
pub struct Union {
    name: String,
    variants: Vec<UnionVariant>,
}

impl Union {
    fn render(&self, dest: &mut impl Write, page: &TsSelectionManifestPage) -> std::fmt::Result {
        writeln!(dest, "export type {} = {{", self.name)?;
        for variant in &self.variants {
            use SelectionTy::*;
            match &variant.select_ty {
                Scalar | ScalarArgs { .. } => {
                    // scalars always get selected if the union node
                    // gets selected
                    unreachable!()
                }
                Composite { select_ty } => {
                    let select_ty = page.get_ref(select_ty).unwrap();
                    let variant_ty = &variant.ty;
                    writeln!(
                        dest,
                        r#"  "{variant_ty}"?: CompositeSelectNoArgs<{select_ty}>;"#
                    )?
                }
                CompositeArgs { arg_ty, select_ty } => {
                    let arg_ty = page.get_ref(arg_ty).unwrap();
                    let select_ty = page.get_ref(select_ty).unwrap();
                    let variant_ty = &variant.ty;
                    writeln!(
                        dest,
                        r#"  "{variant_ty}"?: CompositeSelectArgs<{arg_ty}, {select_ty}>;"#
                    )?
                }
            };
        }
        writeln!(dest, "}};")?;
        Ok(())
    }
}

impl ManifestEntry for TsSelection {
    type Extras = TsSelectionExtras;

    fn render(&self, dest: &mut impl Write, page: &TsSelectionManifestPage) -> std::fmt::Result {
        match self {
            TsSelection::Object(obj) => obj.render(dest, page),
            TsSelection::Union(union) => union.render(dest, page),
            TsSelection::Alias(_) => Ok(()),
        }
    }

    fn get_reference_expr(&self, page: &TsSelectionManifestPage) -> Option<String> {
        match self {
            TsSelection::Object(obj) => Some(obj.name.clone()),
            TsSelection::Union(union) => Some(union.name.clone()),
            TsSelection::Alias(key) => page.get_ref(key),
        }
    }
}

pub fn manifest_page(
    tg: &typegraph::Typegraph,
    types_memo: Arc<IndexMap<TypeKey, String>>,
) -> TsSelectionManifestPage {
    let mut map = IndexMap::new();

    for (key, ty) in tg.output_types.iter() {
        if !ty.is_composite() {
            continue;
        }

        match ty {
            Type::Boolean(_)
            | Type::Float(_)
            | Type::Integer(_)
            | Type::String(_)
            | Type::File(_) => unreachable!("scalars don't get to have selections"),
            Type::Optional(ty) => {
                map.insert(*key, TsSelection::Alias(ty.item().key()));
            }
            Type::List(ty) => {
                map.insert(*key, TsSelection::Alias(ty.item().key()));
            }
            Type::Function(_) => {} // unreachable
            Type::Object(ty) => {
                let ty_props = ty.properties();
                let mut props = Vec::with_capacity(ty_props.len());
                for (prop_name, prop) in ty_props {
                    let prop_name = normalize_struct_prop_name(prop_name);
                    let select_ty = selection_for_field(&prop.ty);
                    props.push((prop_name, select_ty));
                }
                map.insert(
                    *key,
                    TsSelection::Object(Object {
                        props,
                        name: format!("{}Selections", normalize_type_title(&ty.name())),
                    }),
                );
            }
            Type::Union(ty) => {
                let ty_variants = ty.variants();
                let mut variants = Vec::with_capacity(ty_variants.len());
                for variant in ty_variants {
                    if !variant.is_composite() {
                        continue;
                    }
                    let selection = selection_for_field(variant);
                    variants.push(UnionVariant {
                        ty: variant.title().to_string(),
                        select_ty: selection,
                    });
                }
                map.insert(
                    *key,
                    TsSelection::Union(Union {
                        name: format!("{}Selections", normalize_type_title(&ty.name())),
                        variants,
                    }),
                );
            }
        }
    }

    ManifestPage::with_extras(map, TsSelectionExtras { types_memo })
}
