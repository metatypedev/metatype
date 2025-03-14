// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{collections::HashMap, fmt::Write};

use tg_schema::*;

use super::utils::normalize_type_title;
use crate::{
    interlude::*,
    shared::{
        files::{serialize_typepaths_json, TypePath},
        types::*,
    },
};

pub struct PyNodeMetasRenderer {
    pub name_mapper: Rc<super::NameMapper>,
    pub named_types: Rc<std::sync::Mutex<IndexSet<u32>>>,
    pub input_files: Rc<HashMap<u32, Vec<TypePath>>>,
}

impl PyNodeMetasRenderer {
    /// `props` is a map of prop_name -> (TypeName, subNodeName)
    fn render_for_object(
        &self,
        dest: &mut impl Write,
        ty_name: &str,
        props: IndexMap<String, Rc<str>>,
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
        argument_fields: Option<IndexMap<String, Rc<str>>>,
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
        variants: IndexMap<String, Rc<str>>,
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

        let name = match cursor.node.clone().deref() {
            TypeNode::Any { .. } => unimplemented!("Any type support not implemented"),
            TypeNode::Boolean { .. }
            | TypeNode::Float { .. }
            | TypeNode::Integer { .. }
            | TypeNode::String { .. }
            | TypeNode::File { .. } => "scalar".into(),
            // list and optional node just return the meta of the wrapped type
            TypeNode::Optional {
                data: OptionalTypeData { item, .. },
                ..
            }
            | TypeNode::List {
                data: ListTypeData { items: item, .. },
                ..
            } => renderer
                .render_subgraph(*item, cursor)?
                .0
                .unwrap()
                .to_string(),
            TypeNode::Function { data, base } => {
                let (return_ty_name, _cyclic) = renderer.render_subgraph(data.output, cursor)?;
                let return_ty_name = return_ty_name.unwrap();
                let props = match renderer.nodes[data.input as usize].deref() {
                    TypeNode::Object { data, .. } if !data.properties.is_empty() => {
                        let props = data
                            .properties
                            .iter()
                            // generate property types first
                            .map(|(name, &dep_id)| {
                                eyre::Ok((name.clone(), self.name_mapper.name_for(dep_id)))
                            })
                            .collect::<Result<IndexMap<_, _>, _>>()?;
                        Some(props)
                    }
                    _ => None,
                };
                let node_name = &base.title;
                let ty_name = normalize_type_title(node_name).to_pascal_case();
                let input_files = self
                    .input_files
                    .get(&cursor.id)
                    .and_then(|files| serialize_typepaths_json(files));
                self.render_for_func(renderer, &ty_name, &return_ty_name, props, input_files)?;
                ty_name
            }
            TypeNode::Object { data, base } => {
                let props = data
                    .properties
                    .iter()
                    // generate property types first
                    .map(|(name, &dep_id)| {
                        let (ty_name, _cyclic) = renderer.render_subgraph(dep_id, cursor)?;
                        let ty_name = ty_name.unwrap();
                        eyre::Ok((name.clone(), ty_name))
                    })
                    .collect::<Result<IndexMap<_, _>, _>>()?;
                let node_name = &base.title;
                let ty_name = normalize_type_title(node_name).to_pascal_case();
                self.render_for_object(renderer, &ty_name, props)?;
                ty_name
            }
            TypeNode::Either {
                data: EitherTypeData { one_of: variants },
                base,
            }
            | TypeNode::Union {
                data: UnionTypeData { any_of: variants },
                base,
            } => {
                let mut named_set = vec![];
                let variants = variants
                    .iter()
                    .filter_map(|&inner| {
                        if !renderer.is_composite(inner) {
                            return None;
                        }
                        named_set.push(inner);
                        let (ty_name, _cyclic) = match renderer.render_subgraph(inner, cursor) {
                            Ok(val) => val,
                            Err(err) => return Some(Err(err)),
                        };
                        let ty_name = ty_name.unwrap();
                        Some(eyre::Ok((
                            renderer.nodes[inner as usize].deref().base().title.clone(),
                            ty_name,
                        )))
                    })
                    .collect::<Result<IndexMap<_, _>, _>>()?;
                if !variants.is_empty() {
                    {
                        let mut named_types = self.named_types.lock().unwrap();
                        named_types.extend(named_set)
                    }
                    let ty_name = normalize_type_title(&base.title);
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
