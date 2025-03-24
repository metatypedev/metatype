// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::Write;

use heck::ToPascalCase as _;

use super::shared::manifest::{ManifestEntry, ManifestPage};
use super::utils::*;
use crate::{interlude::*, shared::client::*};

pub struct Extras {
    input_types: IndexMap<TypeKey, String>,
}

pub type PySelectionsPage = ManifestPage<PySelection, Extras>;

#[derive(Debug)]
pub enum PySelection {
    Object(Object),
    Union(Union),
}

impl ManifestEntry for PySelection {
    type Extras = Extras;

    fn render(&self, out: &mut impl Write, page: &PySelectionsPage) -> std::fmt::Result {
        match self {
            Self::Object(obj) => obj.render(out, page),
            Self::Union(union) => union.render(out, page),
        }
    }

    fn get_reference_expr(&self, _: &PySelectionsPage) -> Option<String> {
        match self {
            Self::Object(obj) => Some(obj.name.clone()),
            Self::Union(union) => Some(union.name.clone()),
        }
    }
}

#[derive(Debug)]
pub struct ObjectProp {
    name: String,
    select_ty: SelectionTy,
}

#[derive(Debug)]
pub struct Object {
    pub name: String,
    pub props: Vec<ObjectProp>,
}

impl Object {
    pub fn render(&self, dest: &mut impl Write, page: &PySelectionsPage) -> std::fmt::Result {
        let ty_name = &self.name;
        writeln!(dest, r#"{ty_name} = typing.TypedDict("{ty_name}", {{"#)?;
        writeln!(dest, r#"    "_": SelectionFlags,"#)?;
        for prop in self.props.iter() {
            let name = &prop.name;
            use SelectionTy::*;
            match &prop.select_ty {
                Scalar => writeln!(dest, r#"    "{name}": ScalarSelectNoArgs,"#)?,
                ScalarArgs { arg_ty } => {
                    let arg_ty = page.extras.input_types.get(arg_ty).unwrap();
                    writeln!(dest, r#"    "{name}": ScalarSelectArgs["{arg_ty}"],"#)?
                }
                Composite { select_ty } => {
                    let select_ty = page.get_ref(select_ty).unwrap();
                    writeln!(
                        dest,
                        r#"    "{name}": CompositeSelectNoArgs["{select_ty}"],"#
                    )?
                }
                CompositeArgs { arg_ty, select_ty } => {
                    let arg_ty = page.extras.input_types.get(arg_ty).unwrap();
                    let select_ty = page.get_ref(select_ty).unwrap();
                    writeln!(
                        dest,
                        r#"    "{name}": CompositeSelectArgs["{arg_ty}", "{select_ty}"],"#
                    )?
                }
            };
        }
        writeln!(dest, "}}, total=False)")?;
        writeln!(dest)?;
        Ok(())
    }
}

#[derive(Debug)]
pub struct UnionVariant {
    variant_ty: Arc<str>,
    select_ty: SelectionTy,
}

#[derive(Debug)]
pub struct Union {
    name: String,
    variants: Vec<UnionVariant>,
}

impl Union {
    fn render(&self, dest: &mut impl Write, page: &PySelectionsPage) -> std::fmt::Result {
        let ty_name = &self.name;
        writeln!(dest, r#"{ty_name} = typing.TypedDict("{ty_name}", {{"#)?;
        writeln!(dest, r#"    "_": SelectionFlags,"#)?;
        for variant in &self.variants {
            let variant_ty = &variant.variant_ty;
            use SelectionTy::*;
            match &variant.select_ty {
                Scalar | ScalarArgs { .. } => {
                    // scalars always get selected if the union node
                    // gets selected
                    unreachable!()
                }
                Composite { select_ty } => {
                    let select_ty = page.get_ref(select_ty).unwrap();
                    writeln!(
                        dest,
                        // use variant_ty as key instead of normalized struct name
                        // we want it to match the varaint name from the NodeMetas
                        // later so no normlalization is used
                        r#"    "{variant_ty}": CompositeSelectNoArgs["{select_ty}"],"#
                    )?
                }
                CompositeArgs { arg_ty, select_ty } => {
                    let arg_ty = page.extras.input_types.get(arg_ty).unwrap();
                    let select_ty = page.get_ref(select_ty).unwrap();
                    writeln!(
                        dest,
                        r#"    "{variant_ty}": CompositeSelectArgs["{arg_ty}", "{select_ty}"],"#
                    )?
                }
            };
        }
        writeln!(dest, "}}, total=False)")?;
        writeln!(dest)?;
        Ok(())
    }
}

impl PySelectionsPage {
    pub fn new(tg: &typegraph::Typegraph, input_types: IndexMap<TypeKey, String>) -> Self {
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
                | Type::File(_) => {
                    unreachable!("scalars don't get to have selections")
                }
                Type::Optional(_) | Type::List(_) | Type::Function(_) => {}
                Type::Object(ty) => {
                    let props = ty
                        .properties()
                        .iter()
                        .map(|(prop_name, prop)| ObjectProp {
                            name: normalize_struct_prop_name(prop_name),
                            select_ty: selection_for_field(&prop.ty),
                        })
                        .collect();
                    map.insert(
                        *key,
                        PySelection::Object(Object {
                            name: format!(
                                "{}Selections",
                                normalize_type_title(&ty.name()).to_pascal_case()
                            ),
                            props,
                        }),
                    );
                }
                Type::Union(ty) => {
                    let variants = ty
                        .variants()
                        .iter()
                        .filter(|v| v.is_composite())
                        .map(|variant| {
                            let variant_ty = variant.name();
                            let select_ty = selection_for_field(variant);
                            UnionVariant {
                                variant_ty,
                                select_ty,
                            }
                        })
                        .collect();
                    map.insert(
                        *key,
                        PySelection::Union(Union {
                            name: format!(
                                "{}Selections",
                                normalize_type_title(&ty.name()).to_pascal_case()
                            ),
                            variants,
                        }),
                    );
                }
            }
        }

        ManifestPage::with_extras(map, Extras { input_types })
    }
}
