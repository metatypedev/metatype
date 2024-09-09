// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::Write;

use common::typegraph::*;

use super::utils::normalize_type_title;
use crate::{interlude::*, shared::types::*};

pub struct TsNodeMetasRenderer {
    pub name_mapper: Rc<super::NameMapper>,
}

impl TsNodeMetasRenderer {
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
  {ty_name}(): NodeMeta {{
    return {{
      subNodes: ["#
        )?;
        for (key, node_ref) in props {
            write!(
                dest,
                r#"
        ["{key}", nodeMetas.{node_ref}],"#
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

    fn render_for_func(
        &self,
        dest: &mut impl Write,
        ty_name: &str,
        return_node: &str,
        argument_fields: Option<IndexMap<String, Rc<str>>>,
    ) -> std::fmt::Result {
        write!(
            dest,
            r#"
  {ty_name}(): NodeMeta {{
    return {{
      ...nodeMetas.{return_node}(),"#
        )?;
        if let Some(fields) = argument_fields {
            write!(
                dest,
                r#"
      argumentTypes: {{"#
            )?;

            for (key, ty) in fields {
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
        write!(
            dest,
            r#"
    }};
  }},"#
        )?;
        Ok(())
    }
}

impl RenderType for TsNodeMetasRenderer {
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
            } => renderer.render_subgraph(*item, cursor)?.0.unwrap().to_string(),
            TypeNode::Function { data, base } => {
                let (return_ty_name, _cyclic) = renderer.render_subgraph(data.output, cursor)?;
                let return_ty_name = return_ty_name.unwrap() ;
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
                self.render_for_func(renderer, &ty_name, &return_ty_name, props)?;
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
                ..
                // data: EitherTypeData { one_of: variants },
                // base,
            }
            | TypeNode::Union {
                ..
                // data: UnionTypeData { any_of: variants },
                // base,
            } => {
                // let variants = variants
                //     .iter()
                //     .map(|&inner| {
                //         let (ty_name, _cyclic) = renderer.render_subgraph(inner, cursor)?;
                //         let ty_name = match ty_name {
                //             RenderedName::Name(name) => name,
                //             RenderedName::Placeholder(name) => name,
                //         };
                //         Ok::<_, anyhow::Error>(ty_name)
                //     })
                //     .collect::<Result<Vec<_>, _>>()?;
                // let ty_name = normalize_type_title(&base.title);
                // self.render_union_type(renderer, &ty_name, variants)?;
                // ty_name
                todo!("unions are wip")
            }
        };
        Ok(name)
    }
}
