// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::fmt::Write;

use typegraph::{conv::TypeKey, TypeNodeExt as _, Wrap as _};

use crate::{interlude::*, utils::GenDestBuf};

pub type VisitedTypePaths = IndexMap<Arc<str>, Vec<Vec<Arc<str>>>>;

// #[derive(Debug, Clone)]
// pub enum RenderedName {
//     Name(Arc<str>),
//     Placeholder(Arc<str>),
// }
//
// impl RenderedName {
//     pub fn unwrap(self) -> Arc<str> {
//         match self {
//             RenderedName::Name(name) => name,
//             RenderedName::Placeholder(name) => name,
//         }
//     }
// }

/// This type tracks the type graph traversal path.
pub struct VisitCursor {
    pub node: Type,
    pub path: Vec<Arc<str>>,
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
            .get(&parent_cursor.node.name())
            .map(|cyclic_paths| {
                // for all cycles that lead back to current
                cyclic_paths
                    .iter()
                    .map(|path| {
                        path[parent_cursor.path.len()..]
                            .iter()
                            // until we arrive at parent
                            .take_while(|&dep_name| dep_name != &parent_cursor.node.name())
                            // see if any are lists
                            .any(|dep_name| {
                                matches!(
                                    renderer.tg.named.get(dep_name).unwrap(),
                                    Type::List { .. }
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

pub type NameMemo = std::collections::BTreeMap<TypeKey, Arc<str>>;

/// type_key, old_str, (final_ty_name) -> new_str
type ReplacementRecords = Vec<(TypeKey, Arc<str>, Box<dyn Fn(&str) -> String>)>;

/// Helper for generating type bodies that's cycle aware.
pub struct TypeRenderer {
    dest: GenDestBuf,
    tg: Arc<Typegraph>,
    // name_memo: IndexMap<TypeKey, RenderedName>,
    render_type: Arc<dyn RenderType>,
    replacement_records: ReplacementRecords,
}

impl TypeRenderer {
    pub fn new(tg: Arc<Typegraph>, render_type: Arc<dyn RenderType>) -> Self {
        Self {
            tg,
            dest: GenDestBuf {
                buf: Default::default(),
            },
            // name_memo: Default::default(),
            render_type,
            replacement_records: Default::default(),
        }
    }
    pub fn is_composite(typ: &Type) -> bool {
        match typ {
            Type::Function { .. } => panic!("function type isn't composite or scalar"),
            // Type::Any { .. } => panic!("Any tye isn't composite or scalar"),
            Type::Boolean { .. }
            | Type::Float { .. }
            | Type::Integer { .. }
            | Type::String { .. }
            | Type::File { .. } => false,
            Type::Object { .. } => true,
            Type::Optional(ty) => Self::is_composite(ty.item()),
            Type::List(ty) => Self::is_composite(ty.item().unwrap()),
            Type::Union(ty) => ty
                .variants()
                .iter()
                .any(|variant| Self::is_composite(variant)),
        }
    }

    // pub fn placeholder_string(
    //     &mut self,
    //     target_name: Arc<str>,
    //     replacement_maker: Box<dyn Fn(&str) -> String>,
    // ) -> Arc<str> {
    //     // dbg!((&id, &replacement_records));
    //     let string: Arc<str> = format!("&&placeholder{}%%", self.replacement_records.len()).into();
    //     self.replacement_records
    //         .push((target_name, string.clone(), replacement_maker));
    //     string
    // }

    pub fn render(&mut self, ty: &Type) -> anyhow::Result<Arc<str>> {
        let (name, _) = self.render_subgraph(
            ty,
            &mut VisitCursor {
                node: self.tg.root.clone().wrap(),
                path: vec![],
                visited_path: Default::default(),
            },
        )?;
        Ok(name)
        // match name {
        //     RenderedName::Name(name) => Ok(name),
        //     RenderedName::Placeholder(_) => unreachable!(),
        // }
    }

    /// The flag notifies if the subgraph was cyclic to the current type and
    /// the implementaiton may correct accordingly.
    pub fn render_subgraph(
        &mut self,
        ty: &Type,
        parent_cursor: &mut VisitCursor,
    ) -> anyhow::Result<(Arc<str>, Option<bool>)> {
        let my_path: Vec<_> = parent_cursor
            .path
            .iter()
            .cloned()
            .chain(std::iter::once(ty.name()))
            .collect();

        let mut current_cursor = VisitCursor {
            node: ty.clone(),
            visited_path: [(ty.name(), vec![my_path.clone()])].into_iter().collect(),
            path: my_path,
        };

        let render_type_impl = self.render_type.clone();

        let _ty_name = render_type_impl.render(self, &mut current_cursor)?;

        let ty_name = ty.name();

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

    pub fn finalize(self) -> String {
        // let mut out = self.dest.buf;
        // let name_memo = self
        //     .name_memo
        //     .into_iter()
        //     .map(|(key, val)| {
        //         let RenderedName::Name(val) = val else {
        //             panic!("placeholder name found at finalize for Type{key:?}")
        //         };
        //         (key, val)
        //     })
        //     .collect::<NameMemo>();
        // for (key, from, fun) in self.replacement_records.into_iter().rev() {
        //     // dbg!((&_id, &records));
        //     let Some(name) = name_memo.get(&key) else {
        //         panic!("unable to find rendered name for replacement target Type{key:?}")
        //     };
        //     let to = fun(name);
        //     out = out.replace(&from[..], &to);
        // }
        // (out, name_memo)

        self.dest.buf
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
pub fn type_body_required(ty: &Type) -> bool {
    match ty {
        // functions will be absent in our gnerated types
        Type::Function { .. } => false,
        // under certain conditionds, we don't want to generate aliases
        // for primitive types. this includes
        // - types with default generated names
        // - types with no special semantics
        Type::Boolean(t) if t.base.title.starts_with("boolean_") => false,
        Type::Integer(ty) if ty.is_plain() && ty.base.title.starts_with("integer_") => false,
        Type::Float(ty) if ty.is_plain() && ty.base.title.starts_with("float_") => false,
        Type::String(ty) if ty.is_plain() && ty.base.title.starts_with("string_") => false,
        Type::File(ty) if ty.is_plain() && ty.base.title.starts_with("file_") => false,
        _ => true,
    }
}
