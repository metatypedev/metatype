// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::Write;

use typegraph::TypeNodeExt as _;

use super::{
    shared::manifest::{ManifestPage, TypeRenderer},
    utils::*,
};
use crate::{interlude::*, shared::client::*};

#[derive(Debug)]
pub struct UnionProp {
    name: String,
    variant_ty: String,
    select_ty: SelectionTy,
}

#[derive(Debug)]
pub enum RustSelection {
    Struct {
        name: String,
        props: Vec<(String, SelectionTy)>,
    },
    Union {
        name: String,
        variants: Vec<UnionProp>,
    },
}

impl TypeRenderer for RustSelection {
    type Extras = Extras;

    fn render(&self, out: &mut impl Write, page: &ManifestPage<Self, Extras>) -> std::fmt::Result {
        match self {
            Self::Struct { name, props } => {
                self.render_for_struct(out, name, props, page)?;
            }
            Self::Union { name, variants } => {
                self.render_for_union(out, name, variants, page)?;
            }
        }

        Ok(())
    }

    fn get_reference_expr(&self, _page: &ManifestPage<Self, Extras>) -> Option<String> {
        match self {
            Self::Struct { name, .. } | Self::Union { name, .. } => Some(name.clone()),
        }
    }
}

impl RustSelection {
    fn render_for_struct(
        &self,
        dest: &mut impl Write,
        name: &str,
        props: &[(String, SelectionTy)],
        page: &ManifestPage<Self, Extras>,
    ) -> std::fmt::Result {
        // derive prop
        writeln!(dest, "#[derive(Default, Debug)]")?;
        writeln!(dest, "pub struct {name}<ATy = NoAlias> {{")?;

        for (name, select_ty) in props {
            use SelectionTy as S;
            match select_ty {
                S::Scalar => writeln!(dest, r#"    pub {name}: ScalarSelect<ATy>,"#)?,
                S::ScalarArgs { arg_ty } => {
                    let arg_ty = page.extras.input_types.get(arg_ty).unwrap();
                    writeln!(dest, r#"    pub {name}: ScalarSelectArgs<{arg_ty}, ATy>,"#)?
                }
                S::Composite { select_ty } => {
                    let select_ty = page.get_ref(select_ty).unwrap();
                    writeln!(
                        dest,
                        r#"    pub {name}: CompositeSelect<{select_ty}<ATy>, ATy>,"#
                    )?
                }
                S::CompositeArgs { arg_ty, select_ty } => {
                    let arg_ty = page.extras.input_types.get(arg_ty).unwrap();
                    let select_ty = page.get_ref(select_ty).unwrap();
                    writeln!(
                        dest,
                        r#"    pub {name}: CompositeSelectArgs<{arg_ty}, {select_ty}<ATy>, ATy>,"#
                    )?
                }
            };
        }
        writeln!(dest, "}}")?;
        write!(dest, "impl_selection_traits!({name}, ")?;
        let len = props.len();
        for (idx, (name, _)) in props.iter().enumerate() {
            if idx < len - 1 {
                write!(dest, "{name}, ")?;
            } else {
                writeln!(dest, "{name});")?;
            }
        }
        Ok(())
    }

    fn render_for_union(
        &self,
        dest: &mut impl Write,
        name: &str,
        props: &[UnionProp],
        page: &ManifestPage<Self, Extras>,
    ) -> std::fmt::Result {
        // derive prop
        writeln!(dest, "#[derive(Default, Debug)]")?;
        writeln!(dest, "pub struct {name}<ATy = NoAlias> {{")?;

        for UnionProp {
            name,
            select_ty,
            variant_ty: _,
        } in props
        {
            use SelectionTy::*;
            match select_ty {
                Scalar | ScalarArgs { .. } => {
                    // scalars always get selected if the union node
                    // gets selected
                    unreachable!()
                }
                Composite { select_ty } => {
                    let select_ty = page.get_ref(select_ty).unwrap();
                    writeln!(
                        dest,
                        r#"    pub {name}: CompositeSelect<{select_ty}<ATy>, NoAlias>,"#
                    )?
                }
                CompositeArgs { arg_ty, select_ty } => {
                    let arg_ty = page.extras.input_types.get(arg_ty).unwrap();
                    let select_ty = page.get_ref(select_ty).unwrap();
                    writeln!(
                        dest,
                        r#"    pub {name}: CompositeSelectArgs<{arg_ty}, {select_ty}<ATy>, NoAlias>,"#
                    )?
                }
            };
        }
        writeln!(dest, "}}")?;
        write!(dest, "impl_union_selection_traits!({name}")?;
        for UnionProp {
            name, variant_ty, ..
        } in props.iter()
        {
            write!(dest, r#", ("{variant_ty}", {name})"#)?;
        }
        writeln!(dest, r#");"#)?;
        Ok(())
    }
}

pub struct Extras {
    input_types: IndexMap<TypeKey, String>,
}

pub fn manifest_page(
    tg: &typegraph::Typegraph,
    input_types: IndexMap<TypeKey, String>,
) -> ManifestPage<RustSelection, Extras> {
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
            Type::Optional(_) | Type::List(_) | Type::Function(_) => {}
            Type::Object(ty) => {
                let props = ty
                    .properties()
                    .iter()
                    .map(|(prop_name, prop)| {
                        (
                            normalize_struct_prop_name(prop_name),
                            selection_for_field(&prop.ty),
                        )
                        //
                    })
                    .collect();
                map.insert(
                    *key,
                    RustSelection::Struct {
                        props,
                        name: format!("{}Selections", normalize_type_title(&ty.name())),
                    },
                );
            }
            Type::Union(ty) => {
                let mut variants = vec![];
                for variant in ty.variants() {
                    if !variant.is_composite() {
                        continue;
                    }
                    let struct_prop_name = normalize_struct_prop_name(variant.title());
                    let selection = selection_for_field(variant);
                    variants.push(UnionProp {
                        name: struct_prop_name,
                        variant_ty: variant.name().to_string(), // FIXME normalized??
                        select_ty: selection,
                    });
                }
                map.insert(
                    *key,
                    RustSelection::Union {
                        variants,
                        name: format!("{}Selections", normalize_type_title(&ty.name())),
                    },
                );
            }
        }
    }

    ManifestPage::with_extras(map, Extras { input_types })
}

pub type RustSelectionManifestPage = ManifestPage<RustSelection, Extras>;
