// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{
    collections::{HashMap, HashSet},
    rc::Rc,
};

use common::typegraph::{
    visitor::{Edge, PathSegment},
    StringFormat, TypeNode, Typegraph,
};

use crate::errors::TgError;

pub struct NamingProcessor {
    pub user_named: HashSet<u32>,
}
impl super::PostProcessor for NamingProcessor {
    fn postprocess(
        self,
        tg: &mut common::typegraph::Typegraph,
    ) -> Result<(), crate::errors::TgError> {
        let cx = VisitContext {
            tg,
            user_named: self.user_named,
        };
        let mut acc = VisitCollector {
            named_types: Default::default(),
            path: vec![],
        };

        let TypeNode::Object {
            data: root_data, ..
        } = &tg.types[0]
        else {
            panic!("first item must be root object")
        };
        for (key, &ty_id) in &root_data.properties {
            acc.path.push((
                PathSegment {
                    from: 0,
                    edge: Edge::ObjectProp(key.clone()),
                },
                Rc::from("root"),
            ));
            visit_type(&cx, &mut acc, ty_id).map_err(|err| TgError::from(format!("{err}")))?;
        }
        // crate::logger::error!("{:?} - {:#?}", cx.user_named, acc.named_types);
        for (id, name) in acc.named_types {
            let node = &mut tg.types[id as usize];
            node.base_mut().title = name.to_string();
        }
        Ok(())
    }
}

struct VisitContext<'a> {
    tg: &'a Typegraph,
    user_named: HashSet<u32>,
}
struct VisitCollector {
    named_types: HashMap<u32, Rc<str>>,
    path: Vec<(PathSegment, Rc<str>)>,
}

fn visit_type(cx: &VisitContext, acc: &mut VisitCollector, id: u32) -> anyhow::Result<Rc<str>> {
    if let Some(name) = acc.named_types.get(&id) {
        return Ok(name.clone());
    }
    for (seg, name) in &acc.path {
        if seg.from == id {
            return Ok(name.clone());
        }
    }

    let node = &cx.tg.types[id as usize];
    let name = match node {
        TypeNode::Optional { data, .. } => {
            acc.path.push((
                PathSegment {
                    from: id,
                    edge: Edge::OptionalItem,
                },
                Rc::from("placeholder"),
            ));
            let inner_name = visit_type(cx, acc, data.item)?;
            acc.path.pop();
            // gen_name(cx, acc, id, "optional")
            gen_name(cx, acc, id, &format!("{inner_name}_optional"))
            // format!("{inner_name}_optional").into()
        }
        TypeNode::List { data, .. } => {
            acc.path.push((
                PathSegment {
                    from: id,
                    edge: Edge::ArrayItem,
                },
                Rc::from("placeholder"),
            ));
            let inner_name = visit_type(cx, acc, data.items)?;
            acc.path.pop();
            // gen_name(cx, acc, id, "list")
            /* if cx.user_named.contains(&data.items) {
                gen_name(cx, acc, id, &format!("{_inner_name}_list"))
            } else {
                format!("{_inner_name}_list").into()
            } */
            // format!("{inner_name}_list").into()
            gen_name(cx, acc, id, &format!("{inner_name}_list"))
        }
        TypeNode::Object { data, .. } => {
            let name = gen_name(cx, acc, id, "struct");
            for (key, &prop_id) in &data.properties {
                acc.path.push((
                    PathSegment {
                        from: id,
                        edge: Edge::ObjectProp(key.clone()),
                    },
                    name.clone(),
                ));
                _ = visit_type(cx, acc, prop_id)?;
                acc.path.pop();
            }
            name
        }
        TypeNode::Union { data, .. } => {
            let name = gen_name(cx, acc, id, "union");
            for (idx, &variant_id) in data.any_of.iter().enumerate() {
                acc.path.push((
                    PathSegment {
                        from: id,
                        edge: Edge::UnionVariant(idx),
                    },
                    name.clone(),
                ));
                _ = visit_type(cx, acc, variant_id)?;
                acc.path.pop();
            }
            name
        }
        TypeNode::Either { data, .. } => {
            let name = gen_name(cx, acc, id, "either");
            for (idx, &variant_id) in data.one_of.iter().enumerate() {
                acc.path.push((
                    PathSegment {
                        from: id,
                        edge: Edge::UnionVariant(idx),
                    },
                    name.clone(),
                ));
                _ = visit_type(cx, acc, variant_id)?;
                acc.path.pop();
            }
            name
        }
        TypeNode::Function { data, .. } => {
            let name = gen_name(cx, acc, id, "fn");
            {
                acc.path.push((
                    PathSegment {
                        from: id,
                        edge: Edge::FunctionInput,
                    },
                    name.clone(),
                ));
                _ = visit_type(cx, acc, data.input)?;
                acc.path.pop();
            }
            {
                acc.path.push((
                    PathSegment {
                        from: id,
                        edge: Edge::FunctionOutput,
                    },
                    name.clone(),
                ));
                _ = visit_type(cx, acc, data.output)?;
                acc.path.pop();
            }
            name
        }
        TypeNode::Boolean { .. } => gen_name(cx, acc, id, "boolean"),
        TypeNode::Float { .. } => gen_name(cx, acc, id, "float"),
        TypeNode::Integer { base, .. } => {
            let base_name = if base.enumeration.as_ref().map(|vec| !vec.is_empty()) == Some(true) {
                "integer_enum"
            } else {
                "integer"
            };
            gen_name(cx, acc, id, base_name)
        }
        TypeNode::String { data, base } => {
            let base_name = if let Some(format) = &data.format {
                match format {
                    StringFormat::Uuid => "string_uuid",
                    StringFormat::Email => "string_email",
                    StringFormat::Uri => "string_uri",
                    StringFormat::Json => "string_json",
                    StringFormat::Hostname => "string_hostname",
                    StringFormat::Ean => "string_ean",
                    StringFormat::Date => "string_date",
                    StringFormat::DateTime => "string_datetime",
                    StringFormat::Phone => "string_phone",
                }
            } else if base.enumeration.as_ref().map(|vec| !vec.is_empty()) == Some(true) {
                "string_enum"
            } else {
                "string"
            };
            gen_name(cx, acc, id, base_name)
        }
        TypeNode::File { .. } => gen_name(cx, acc, id, "file"),
        TypeNode::Any { .. } => gen_name(cx, acc, id, "any"),
    };

    acc.named_types.insert(id, name.clone());
    Ok(name)
}

fn gen_name(cx: &VisitContext, acc: &mut VisitCollector, id: u32, ty_name: &str) -> Rc<str> {
    let name: Rc<str> = if cx.user_named.contains(&id) {
        let node = &cx.tg.types[id as usize];
        node.base().title.clone().into()
    } else {
        let title;
        let mut last = acc.path.len();
        loop {
            last -= 1;
            let (last_segment, last_name) = &acc.path[last];
            title = match &last_segment.edge {
                // we don't include optional and list nodes in
                // generated names (useless but also, they might be placeholders)
                Edge::OptionalItem | Edge::ArrayItem => continue,
                Edge::FunctionInput => format!("{last_name}_input"),
                Edge::FunctionOutput => format!("{last_name}_output"),
                Edge::ObjectProp(key) => format!("{last_name}_{key}_{ty_name}"),
                Edge::EitherVariant(idx) | Edge::UnionVariant(idx) => {
                    format!("{last_name}_t{idx}_{ty_name}")
                }
            };
            break;
        }
        title.into()
    };
    name
}

/* struct NameRenderer {
    tg: &'a Typegraph,
    user_named: HashSet<u32>,
    named_types: HashMap<u32, Rc<str>>,
    path: Vec<(PathSegment<'b>, Rc<str>)>,
}

impl metagen::shared::types::RenderType for NameRenderer {
    fn render(
        &self,
        renderer: &mut metagen::shared::types::TypeRenderer,
        visit_cursor: &mut metagen::shared::types::VisitCursor,
    ) -> color_eyre::eyre::Result<String> {
    }
} */
