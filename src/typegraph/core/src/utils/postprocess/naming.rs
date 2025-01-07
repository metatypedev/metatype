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
use indexmap::IndexSet;

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

        let TypeNode::Object {
            data: root_data, ..
        } = &tg.types[0]
        else {
            panic!("first item must be root object")
        };

        let mut ref_counters = TypeRefCount {
            counts: Default::default(),
        };
        for (_, &ty_id) in &root_data.properties {
            collect_ref_info(&cx, &mut ref_counters, ty_id, &mut HashSet::new())?;
        }

        let mut acc = VisitCollector {
            named_types: Default::default(),
            path: vec![],
            counts: ref_counters.counts,
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
    counts: HashMap<u32, IndexSet<u32>>,
    path: Vec<(PathSegment, Rc<str>)>,
}

struct TypeRefCount {
    pub counts: HashMap<u32, IndexSet<u32>>,
}

impl TypeRefCount {
    pub fn new_hit(&mut self, id: u32, referrer: u32) {
        self.counts
            .entry(id)
            .and_modify(|counter| {
                counter.insert(referrer);
            })
            .or_insert(IndexSet::from([referrer]));
    }
}

impl VisitCollector {
    pub fn has_more_than_one_referrer(&self, id: u32) -> bool {
        if let Some(referrers) = self.counts.get(&id) {
            return referrers.len() > 1;
        }

        false
    }
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

fn collect_ref_info(
    cx: &VisitContext,
    acc: &mut TypeRefCount,
    id: u32,
    visited: &mut HashSet<u32>,
) -> anyhow::Result<()> {
    if !visited.insert(id) {
        return Ok(());
    }

    let node = &cx.tg.types[id as usize];
    match node {
        TypeNode::Boolean { .. }
        | TypeNode::Float { .. }
        | TypeNode::Integer { .. }
        | TypeNode::String { .. }
        | TypeNode::File { .. }
        | TypeNode::Any { .. } => {
            // base case
        }
        TypeNode::Optional { data, .. } => {
            acc.new_hit(data.item, id);
            collect_ref_info(cx, acc, data.item, visited)?;
        }
        TypeNode::Object { data, .. } => {
            for (_, key_id) in &data.properties {
                acc.new_hit(*key_id, id);
                collect_ref_info(cx, acc, *key_id, visited)?;
            }
        }
        TypeNode::Function { data, .. } => {
            acc.new_hit(data.input, id);
            acc.new_hit(data.output, id);

            collect_ref_info(cx, acc, data.input, visited)?;
            collect_ref_info(cx, acc, data.output, visited)?;
        }
        TypeNode::List { data, .. } => {
            acc.new_hit(data.items, id);
            collect_ref_info(cx, acc, data.items, visited)?;
        }
        TypeNode::Union { data, .. } => {
            for variant in &data.any_of {
                acc.new_hit(*variant, id);
                collect_ref_info(cx, acc, *variant, visited)?;
            }
        }
        TypeNode::Either { data, .. } => {
            for variant in &data.one_of {
                acc.new_hit(*variant, id);
                collect_ref_info(cx, acc, *variant, visited)?;
            }
        }
    };

    visited.remove(&id);

    Ok(())
}

fn gen_name(cx: &VisitContext, acc: &mut VisitCollector, id: u32, ty_name: &str) -> Rc<str> {
    let node = &cx.tg.types[id as usize];
    let name: Rc<str> = if cx.user_named.contains(&id) {
        node.base().title.clone().into()
    } else if node.is_scalar() {
        format!("scalar_{ty_name}").into()
    } else {
        let use_if_ok = |default: String| {
            if acc.has_more_than_one_referrer(id) {
                // Cannot be opinionated on the prefix path if shared (confusing)
                format!("{ty_name}_shared_t{id}")
            } else {
                default
            }
        };

        let title;
        let mut last = acc.path.len();
        loop {
            last -= 1;
            let (last_segment, last_name) = &acc.path[last];
            title = match &last_segment.edge {
                // we don't include optional and list nodes in
                // generated names (useless but also, they might be placeholders)
                Edge::OptionalItem | Edge::ArrayItem => continue,
                Edge::FunctionInput => use_if_ok(format!("{last_name}_input")),
                Edge::FunctionOutput => use_if_ok(format!("{last_name}_output")),
                Edge::ObjectProp(key) => use_if_ok(format!("{last_name}_{key}_{ty_name}")),
                Edge::EitherVariant(idx) | Edge::UnionVariant(idx) => {
                    use_if_ok(format!("{last_name}_t{idx}_{ty_name}"))
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
