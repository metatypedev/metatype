// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{collections::HashMap, fmt::Write};

use typegraph::TypeNodeExt as _;

use super::utils::normalize_type_title;
use crate::{
    interlude::*,
    shared::{
        files::{serialize_typepaths_json, TypePath},
        types::*,
    },
};

pub struct PyNodeMetasRenderer {
    pub name_mapper: Arc<super::NameMapper>,
    pub named_types: Arc<std::sync::Mutex<IndexSet<Arc<str>>>>,
    pub input_files: Arc<HashMap<u32, Vec<TypePath>>>,
}

impl PyNodeMetasRenderer {
    /// `props` is a map of prop_name -> (TypeName, subNodeName)
    fn render_for_object(
        &self,
        dest: &mut impl Write,
        ty_name: &str,
        props: IndexMap<Arc<str>, Arc<str>>,
    ) -> std::fmt::Result {
        write!(
            dest,
            r#"
    @staticmethod
    def {ty_name}():
        return NodeMeta(
            sub_nodes={{"#
        )?;
        for (key, node_ref) in props {
            write!(
                dest,
                r#"
                "{key}": NodeDescs.{node_ref},"#
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

    fn render_for_func(
        &self,
        dest: &mut impl Write,
        ty_name: &str,
        return_node: &str,
        argument_fields: Option<IndexMap<Arc<str>, Arc<str>>>,
        input_files: Option<String>,
    ) -> std::fmt::Result {
        write!(
            dest,
            r#"
    @staticmethod
    def {ty_name}():
        return_node = NodeDescs.{return_node}()
        return NodeMeta(
            sub_nodes=return_node.sub_nodes,
            variants=return_node.variants,"#
        )?;
        if let Some(fields) = argument_fields {
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
        if let Some(input_files) = input_files {
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

    fn render_for_union(
        &self,
        dest: &mut TypeRenderer,
        ty_name: &str,
        variants: IndexMap<String, Arc<str>>,
    ) -> std::fmt::Result {
        write!(
            dest,
            r#"
    @staticmethod
    def {ty_name}():
        return NodeMeta(
            variants={{"#
        )?;
        for (key, node_ref) in variants {
            write!(
                dest,
                r#"
                "{key}": NodeDescs.{node_ref},"#
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

impl RenderType for PyNodeMetasRenderer {
    fn render(
        &self,
        renderer: &mut TypeRenderer,
        cursor: &mut VisitCursor,
    ) -> anyhow::Result<String> {
        use heck::ToPascalCase;

        let name = match &cursor.node {
            Type::Boolean(_)
            | Type::Float(_)
            | Type::Integer(_)
            | Type::String(_)
            | Type::File(_) => "scalar".into(),
            // list and optional node just return the meta of the wrapped type
            Type::Optional(ty) => renderer
                .render_subgraph(ty.item(), cursor)?
                .0
                .unwrap()
                .to_string(),
            Type::List(ty) => renderer
                .render_subgraph(ty.item(), cursor)?
                .0
                .unwrap()
                .to_string(),
            Type::Function(ty) => {
                let (return_ty_name, _cyclic) = renderer.render_subgraph(ty.output(), cursor)?;
                let return_ty_name = return_ty_name.unwrap();
                let input = ty.input();
                let props = {
                    if !input.properties().is_empty() {
                        let props = input
                            .properties()
                            .iter()
                            // generate property types first
                            .map(|(name, prop)| {
                                eyre::Ok((name.clone(), self.name_mapper.name_for(&prop.type_)))
                            })
                            .collect::<Result<IndexMap<_, _>, _>>()?;
                        Some(props)
                    } else {
                        None
                    }
                };
                let node_name = ty.title();
                let ty_name = normalize_type_title(node_name).to_pascal_case();
                let input_files = self
                    .input_files
                    .get(&cursor.node.idx())
                    .and_then(|files| serialize_typepaths_json(files));
                self.render_for_func(renderer, &ty_name, &return_ty_name, props, input_files)?;
                ty_name
            }
            Type::Object(ty) => {
                let props = ty
                    .properties()
                    .iter()
                    // generate property types first
                    .map(|(name, prop)| {
                        let (ty_name, _cyclic) = renderer.render_subgraph(&prop.type_, cursor)?;
                        let ty_name = ty_name.unwrap();
                        eyre::Ok((name.clone(), ty_name))
                    })
                    .collect::<Result<IndexMap<_, _>, _>>()?;
                let node_name = &ty.title();
                let ty_name = normalize_type_title(node_name).to_pascal_case();
                self.render_for_object(renderer, &ty_name, props)?;
                ty_name
            }
            Type::Union(ty) => {
                let mut named_set = vec![];
                let variants = ty
                    .variants()
                    .iter()
                    .filter_map(|variant| {
                        if !TypeRenderer::is_composite(variant) {
                            return None;
                        }
                        named_set.push(variant.name());
                        let (ty_name, _cyclic) = match renderer.render_subgraph(variant, cursor) {
                            Ok(val) => val,
                            Err(err) => return Some(Err(err)),
                        };
                        let ty_name = ty_name.unwrap();
                        Some(eyre::Ok((variant.title().to_string(), ty_name)))
                    })
                    .collect::<Result<IndexMap<_, _>, _>>()?;
                if !variants.is_empty() {
                    {
                        let mut named_types = self.named_types.lock().unwrap();
                        named_types.extend(named_set)
                    }
                    let ty_name = normalize_type_title(ty.title());
                    self.render_for_union(renderer, &ty_name, variants)?;
                    ty_name
                } else {
                    "scalar".into()
                }
            }
        };
        Ok(name)
    }
}
