// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::Write;

use common::typegraph::*;

use crate::{interlude::*, utils::GenDestBuf};

pub type VisitedTypePaths = HashMap<u32, Vec<Vec<u32>>>;

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
    /// The [TypeRenderer] does it's job in two phases.
    /// This phase implements the first phase which is generation of type names.
    ///
    /// To assist in generating names that might to refer to other types inline
    /// like Optional<OtherType>, Placeholder names can be used instead.
    /// This comes in handly when dealing with recursive types.
    fn render_name(&self, renderer: &mut TypeRenderer, visit_cursor: &VisitCursor) -> RenderedName;

    /// The [TypeRenderer] does it's job in two phases.
    /// This phase implements the second phase which is generation of type names.
    /// This phase is used if only the [type_body_required] returns true.
    ///
    /// Along with the [VisitCursor], the name generated from [render_name] will
    /// be passed (either the real name or the auto-placeholder). It's upto the
    /// implementation to replace placeholders (using [TypeRenderer.replace_placeholder_ty_name])
    /// mayhaps.
    ///
    /// [TypeRenderer] implements [core::fmt::Write] and the implementation is expected
    /// to write the generated code into it but it may choose not to do so. Types that refer
    /// others can call [TypeRenderer.render_subgraph] to render other types first. The
    /// method returns a flag to notify if the subgraph was cyclic to the current type and
    /// the implementaiton may correct accordingly.
    fn render_body(
        &self,
        renderer: &mut TypeRenderer,
        ty_name: &str,
        visit_cursor: &mut VisitCursor,
    ) -> anyhow::Result<()>;

    /// Weather or not to use [`render_body`] for the specified type.
    /// The default implementation returns true for all but the simple primitive
    /// types. Whatmore, it returns true if the primitive has a user defined alias,
    /// type validator and other interesting metadata.
    fn type_body_required(&self, node: Rc<TypeNode>) -> bool {
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

pub type NameMemo = HashMap<u32, Rc<str>>;

/// Helper for generating type bodies that's cycle aware.
pub struct TypeRenderer {
    dest: GenDestBuf,
    nodes: Vec<Rc<TypeNode>>,
    name_memo: NameMemo,
    render_type: Rc<dyn RenderType>,
    replacement_records: Vec<(u32, Vec<(String, String)>)>,
}

pub enum RenderedName {
    Name(String),
    Placeholder,
}

impl TypeRenderer {
    pub fn new(nodes: &[TypeNode], render_type: Rc<dyn RenderType>) -> Self {
        Self {
            dest: GenDestBuf {
                buf: Default::default(),
            },
            name_memo: Default::default(),
            nodes: nodes.iter().cloned().map(Rc::new).collect(),
            render_type,
            replacement_records: vec![],
        }
    }

    pub fn replace_placeholder_ty_name(
        &mut self,
        id: u32,
        replacement: Rc<str>,
        mut replacement_records: Vec<(String, String)>,
    ) {
        let old_name = self.name_memo.insert(id, replacement.clone()).unwrap();
        replacement_records.insert(0, (old_name.to_string(), replacement.to_string()));
        // dbg!((&id, &replacement_records));
        self.replacement_records.push((id, replacement_records));
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
        Ok(name)
    }

    pub fn render_subgraph(
        &mut self,
        id: u32,
        parent_cursor: &mut VisitCursor,
    ) -> anyhow::Result<(Rc<str>, Option<bool>)> {
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
        } else {
            let render_type_impl = self.render_type.clone();

            // generate the type name up first
            let ty_name = render_type_impl.render_name(self, &current_cursor);
            let is_placeholder = matches!(ty_name, RenderedName::Placeholder);
            let ty_name: Rc<str> = match ty_name {
                RenderedName::Name(name) => name.into(),
                RenderedName::Placeholder => format!("&&placeholder{id}%%").into(),
            };

            // insert typename into memo before generation to allow cyclic resolution
            // if this function is recursively called when generating dependent branches
            self.name_memo.insert(id, ty_name.clone());

            if render_type_impl.type_body_required(node) {
                render_type_impl.render_body(self, &ty_name, &mut current_cursor)?;
            }
            if is_placeholder && self.name_memo.get(&id) == Some(&ty_name) {
                bail!("placeholder name generated for \"{id}\" ({ty_name}) was not replaced by RenderType impl");
            }
            ty_name
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
        for (_id, records) in self.replacement_records.into_iter().rev() {
            // dbg!((&_id, &records));
            for (from, to) in records {
                out = out.replace(&from, &to);
            }
        }
        (out, self.name_memo)
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
