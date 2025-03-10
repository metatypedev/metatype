// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{collections::HashMap, fmt::Write};

use typegraph::TypeNodeExt as _;

use super::{
    shared::manifest::{ManifestPage, TypeRenderer},
    utils::*,
};
use crate::{interlude::*, shared::client::*, shared::types::*};

// pub struct RsNodeSelectionsRenderer {
//     pub arg_ty_names: Arc<NameMemo>,
// }

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
    fn render(
        &self,
        out: &mut impl Write,
        _page: &ManifestPage<Self>,
        name_memo: &impl NameMemo,
    ) -> std::fmt::Result {
        match self {
            Self::Struct { name, props } => {
                self.render_for_struct(out, name, props, name_memo)?;
            }
            Self::Union { name, variants } => {
                self.render_for_union(out, name, variants, name_memo)?;
            }
        }

        Ok(())
    }

    fn get_reference_expr(
        &self,
        _page: &ManifestPage<Self>,
        _memo: &impl NameMemo,
    ) -> Option<String> {
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
        name_memo: &impl NameMemo,
    ) -> std::fmt::Result {
        // derive prop
        writeln!(dest, "#[derive(Default, Debug)]")?;
        writeln!(dest, "pub struct {name}<ATy = NoAlias> {{")?;
        for (name, select_ty) in props {
            use SelectionTy as S;
            match select_ty {
                S::Scalar => writeln!(dest, r#"    pub {name}: ScalarSelect<ATy>,"#)?,
                S::ScalarArgs { arg_ty } => {
                    let arg_ty = name_memo.get(*arg_ty).unwrap();
                    writeln!(dest, r#"    pub {name}: ScalarSelectArgs<{arg_ty}, ATy>,"#)?
                }
                S::Composite { select_ty } => {
                    let select_ty = name_memo.get(*select_ty).unwrap();
                    writeln!(
                        dest,
                        r#"    pub {name}: CompositeSelect<{select_ty}<ATy>, ATy>,"#
                    )?
                }
                S::CompositeArgs { arg_ty, select_ty } => {
                    let arg_ty = name_memo.get(*arg_ty).unwrap();
                    let select_ty = name_memo.get(*select_ty).unwrap();
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
        name_memo: &impl NameMemo,
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
                    let select_ty = name_memo.get(*select_ty).unwrap();
                    writeln!(
                        dest,
                        r#"    pub {name}: CompositeSelect<{select_ty}<ATy>, NoAlias>,"#
                    )?
                }
                CompositeArgs { arg_ty, select_ty } => {
                    let arg_ty = name_memo.get(*arg_ty).unwrap();
                    let select_ty = name_memo.get(*select_ty).unwrap();
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

pub fn manifest_page(tg: &typegraph::Typegraph) -> ManifestPage<RustSelection> {
    let mut map = IndexMap::new();

    for (key, ty) in tg.output_types.iter() {
        if !is_composite(ty) {
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
                            selection_for_field(&prop.type_).unwrap(),
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
                let variants = ty
                    .variants()
                    .iter()
                    .filter_map(|variant| {
                        if !is_composite(variant) {
                            return None;
                        }
                        let struct_prop_name = normalize_struct_prop_name(&variant.title());
                        let selection = selection_for_field(variant).unwrap();
                        Some(eyre::Ok(UnionProp {
                            name: struct_prop_name,
                            variant_ty: variant.name().to_string(), // FIXME normalized??
                            select_ty: selection,
                        }))
                    })
                    .collect::<Result<Vec<_>, _>>()
                    .unwrap();
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

    map.into()
}
