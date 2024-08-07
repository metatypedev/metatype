// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::Write;

use common::typegraph::*;

use crate::{interlude::*, utils::GenDestBuf};

pub type VisitedTypePaths = HashMap<u32, Vec<Vec<u32>>>;

#[derive(Debug, Clone)]
pub enum RenderedName {
    Name(Rc<str>),
    Placeholder(Rc<str>),
}

impl RenderedName {
    pub fn unwrap(self) -> Rc<str> {
        match self {
            RenderedName::Name(name) => name,
            RenderedName::Placeholder(name) => name,
        }
    }
}

/// This type tracks the type graph traversal path.
pub struct VisitCursor {
    pub id: u32,
    pub node: Rc<TypeNode>,
    pub path: Vec<u32>,
    pub visited_path: VisitedTypePaths,
}

/// Trait to provides implementation for a lanaguage specific
/// type code generation
/// Used by [TypeRenderer].
pub trait RenderType {
    /// [TypeRenderer] implements [core::fmt::Write] and the implementation is expected
    /// to write the generated code into it but it may choose not to do so. Types that refer
    /// others can call [TypeRenderer.render_subgraph] to render other types first.
    fn render(
        &self,
        renderer: &mut TypeRenderer,
        visit_cursor: &mut VisitCursor,
    ) -> anyhow::Result<String>;

    /// Wether or not the parent node was visited when a part of the graph
    /// was traversed in an _unfortunate_ manner. This is more than a cyclic
    /// test but a cycle that's _unfortunate_. If the implementaiton is
    /// resistant to certain types of cycles, it can return false to signal
    /// that the cycle is fortunate and doesn't need special handling.
    ///
    /// The default implementation treats all cycles as unfortunate excepts
    /// those that are broken by a List type.
    fn is_path_unfortunately_cyclic(
        &self,
        renderer: &TypeRenderer,
        parent_cursor: &VisitCursor,
        current_cursor: &VisitCursor,
    ) -> Option<bool> {
        current_cursor
            .visited_path
            .get(&parent_cursor.id)
            .map(|cyclic_paths| {
                // for all cycles that lead back to current
                cyclic_paths
                    .iter()
                    .map(|path| {
                        path[parent_cursor.path.len()..]
                            .iter()
                            // until we arrive at parent
                            .take_while(|&&dep_id| dep_id != parent_cursor.id)
                            // see if any are lists
                            .any(|&dep_id| {
                                matches!(
                                    renderer.nodes[dep_id as usize].deref(),
                                    TypeNode::List { .. }
                                )
                            })
                    })
                    // we know this whole branch is unsized if
                    // any one of the paths don't contain a
                    // type stored on the heap i.e. a vec
                    .any(|has_list| !has_list)
            })
    }
}

pub type NameMemo = std::collections::BTreeMap<u32, Rc<str>>;

/// type_id, old_str, (final_ty_name) -> new_str
type ReplacementRecords = Vec<(u32, Rc<str>, Box<dyn Fn(&str) -> String>)>;

/// Helper for generating type bodies that's cycle aware.
pub struct TypeRenderer {
    dest: GenDestBuf,
    pub nodes: Vec<Rc<TypeNode>>,
    name_memo: HashMap<u32, RenderedName>,
    render_type: Rc<dyn RenderType>,
    replacement_records: ReplacementRecords,
}

impl TypeRenderer {
    pub fn new(nodes: Vec<Rc<TypeNode>>, render_type: Rc<dyn RenderType>) -> Self {
        Self {
            dest: GenDestBuf {
                buf: Default::default(),
            },
            name_memo: Default::default(),
            nodes,
            render_type,
            replacement_records: Default::default(),
        }
    }

    pub fn placeholder_string(
        &mut self,
        target_id: u32,
        replacement_maker: Box<dyn Fn(&str) -> String>,
    ) -> Rc<str> {
        // dbg!((&id, &replacement_records));
        let string: Rc<str> = format!("&&placeholder{}%%", self.replacement_records.len()).into();
        self.replacement_records
            .push((target_id, string.clone(), replacement_maker));
        string
    }

    pub fn render(&mut self, id: u32) -> anyhow::Result<Rc<str>> {
        let (name, _) = self.render_subgraph(
            id,
            &mut VisitCursor {
                id: u32::MAX,
                node: self.nodes[0].clone(),
                path: vec![],
                visited_path: Default::default(),
            },
        )?;
        match name {
            RenderedName::Name(name) => Ok(name),
            RenderedName::Placeholder(_) => unreachable!(),
        }
    }

    /// The flag notifies if the subgraph was cyclic to the current type and
    /// the implementaiton may correct accordingly.
    pub fn render_subgraph(
        &mut self,
        id: u32,
        parent_cursor: &mut VisitCursor,
    ) -> anyhow::Result<(RenderedName, Option<bool>)> {
        let my_path: Vec<_> = parent_cursor
            .path
            .iter()
            .copied()
            .chain(std::iter::once(id))
            .collect();

        let node = self.nodes[id as usize].clone();

        let mut current_cursor = VisitCursor {
            id,
            node: node.clone(),
            visited_path: [(id, vec![my_path.clone()])].into_iter().collect(),
            path: my_path,
        };

        // short circuit if we've already generated the type
        let ty_name = if let Some(name) = self.name_memo.get(&id) {
            name.clone()
        } else if parent_cursor.path.contains(&id) {
            let ancestor_placeholder = RenderedName::Placeholder(
                self.placeholder_string(id, Box::new(|ty_name| ty_name.into())),
            );
            self.name_memo.insert(id, ancestor_placeholder.clone());
            ancestor_placeholder
        } else {
            let render_type_impl = self.render_type.clone();

            let ty_name = render_type_impl.render(self, &mut current_cursor)?;
            let ty_name: Rc<str> = ty_name.into();

            // if let Some(RenderedName::Placeholder(placeholder)) = self.name_memo.get(&id) {}

            self.name_memo
                .insert(id, RenderedName::Name(ty_name.clone()));

            RenderedName::Name(ty_name)
        };

        let cyclic =
            self.render_type
                .is_path_unfortunately_cyclic(self, parent_cursor, &current_cursor);
        for (id, paths) in current_cursor.visited_path {
            parent_cursor
                .visited_path
                .entry(id)
                .or_default()
                .extend(paths);
        }
        Ok((ty_name, cyclic))
    }

    pub fn finalize(self) -> (String, NameMemo) {
        let mut out = self.dest.buf;
        let name_memo = self
            .name_memo
            .into_iter()
            .map(|(key, val)| {
                let RenderedName::Name(val) = val else {
                    panic!("placeholder name found at finalize for {key}")
                };
                (key, val)
            })
            .collect::<NameMemo>();
        for (id, from, fun) in self.replacement_records.into_iter().rev() {
            // dbg!((&_id, &records));
            let Some(name) = name_memo.get(&id) else {
                panic!("unable to find rendered name for replacement target {id}")
            };
            let to = fun(name);
            out = out.replace(&from[..], &to);
        }
        (out, name_memo)
    }
}

impl Write for TypeRenderer {
    #[inline]
    fn write_str(&mut self, s: &str) -> core::fmt::Result {
        <GenDestBuf as Write>::write_str(&mut self.dest, s)
    }

    #[inline]
    fn write_char(&mut self, c: char) -> core::fmt::Result {
        <GenDestBuf as Write>::write_char(&mut self.dest, c)
    }
}

/// Most languages don't need to generate bodies for all types
/// types and usually only need reference to the built-in primitives.
/// This function encodes that logic for the common case but won't
/// apply to all langauges.
///
/// To be specific, it returns true for all but the simple primitive types.
/// It also returns true if the primitive has a user defined alias,
/// type validator and other interesting metadata.
pub fn type_body_required(node: Rc<TypeNode>) -> bool {
    match node.deref() {
        // functions will be absent in our gnerated types
        TypeNode::Function { .. } => false,
        // under certain conditionds, we don't want to generate aliases
        // for primitive types. this includes
        // - types with default generated names
        // - types with no special semantics
        TypeNode::Boolean { base } if base.title.starts_with("boolean_") => false,
        TypeNode::Integer {
            base,
            data:
                common::typegraph::IntegerTypeData {
                    minimum: None,
                    maximum: None,
                    multiple_of: None,
                    exclusive_minimum: None,
                    exclusive_maximum: None,
                },
        } if base.title.starts_with("integer_") => false,
        TypeNode::Float {
            base,
            data:
                FloatTypeData {
                    minimum: None,
                    maximum: None,
                    multiple_of: None,
                    exclusive_minimum: None,
                    exclusive_maximum: None,
                },
        } if base.title.starts_with("float_") => false,
        TypeNode::String {
            base:
                TypeNodeBase {
                    enumeration: None,
                    title,
                    ..
                },
            data:
                StringTypeData {
                    min_length: None,
                    max_length: None,
                    format: None,
                    pattern: None,
                },
        } if title.starts_with("string_") => false,
        TypeNode::File {
            base,
            data:
                FileTypeData {
                    min_size: None,
                    max_size: None,
                    mime_types: None,
                },
        } if base.title.starts_with("file_") => false,
        _ => true,
    }
}
