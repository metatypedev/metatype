// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{cell::RefCell, collections::HashMap, fmt::Write};

use typegraph::{conv::TypeKey, FunctionType, ObjectType, TypeNodeExt as _, UnionType};

use super::{
    shared::manifest::{ManifestPage, TypeRenderer},
    utils::normalize_type_title,
};
use crate::{
    interlude::*,
    shared::{files::TypePath, types::*},
};

// pub struct RsNodeMetasRenderer {
//     pub name_mapper: Arc<super::NameMapper>,
//     pub named_types: Arc<std::sync::Mutex<IndexSet<u32>>>,
//     /// path to file types in the input type
//     pub input_files: Arc<HashMap<u32, Vec<TypePath>>>,
// }

// impl RsNodeMetasRenderer {
//     /// `props` is a map of prop_name -> (TypeName, subNodeName)
//     fn render_for_object(
//         &self,
//         dest: &mut impl Write,
//         ty_name: &str,
//         props: IndexMap<String, Arc<str>>,
//     ) -> std::fmt::Result {
//         write!(
//             dest,
//             r#"
// pub fn {ty_name}() -> NodeMeta {{
//     NodeMeta {{
//         arg_types: None,
//         variants: None,
//         sub_nodes: Some(
//             ["#
//         )?;
//         for (key, node_ref) in props {
//             write!(
//                 dest,
//                 r#"
//                 ("{key}".into(), {node_ref} as NodeMetaFn),"#
//             )?;
//         }
//         write!(
//             dest,
//             r#"
//             ].into()
//         ),
//         input_files: None,
//     }}
// }}"#
//         )?;
//         Ok(())
//     }
//
//     fn render_for_union(
//         &self,
//         dest: &mut impl Write,
//         ty_name: &str,
//         props: IndexMap<String, Arc<str>>,
//     ) -> std::fmt::Result {
//         write!(
//             dest,
//             r#"
// pub fn {ty_name}() -> NodeMeta {{
//     NodeMeta {{
//         arg_types: None,
//         sub_nodes: None,
//         variants: Some(
//             ["#
//         )?;
//         for (key, node_ref) in props {
//             write!(
//                 dest,
//                 r#"
//                 ("{key}".into(), {node_ref} as NodeMetaFn),"#
//             )?;
//         }
//         write!(
//             dest,
//             r#"
//             ].into()
//         ),
//         input_files: None,
//     }}
// }}"#
//         )?;
//         Ok(())
//     }
//
//     fn render_for_func(
//         &self,
//         dest: &mut impl Write,
//         ty_name: &str,
//         return_node: &str,
//         argument_fields: Option<IndexMap<String, Arc<str>>>,
//         input_files: Option<String>,
//     ) -> std::fmt::Result {
//         write!(
//             dest,
//             r#"
// pub fn {ty_name}() -> NodeMeta {{
//     NodeMeta {{"#
//         )?;
//         if let Some(fields) = argument_fields {
//             write!(
//                 dest,
//                 r#"
//         arg_types: Some(
//             ["#
//             )?;
//
//             for (key, ty) in fields {
//                 write!(
//                     dest,
//                     r#"
//                 ("{key}".into(), "{ty}".into()),"#
//                 )?;
//             }
//
//             write!(
//                 dest,
//                 r#"
//             ].into()
//         ),"#
//             )?;
//         }
//         if let Some(input_files) = input_files {
//             write!(
//                 dest,
//                 r#"
//         input_files: Some(PathToInputFiles(&{input_files})),"#
//             )?;
//         }
//         write!(
//             dest,
//             r#"
//         ..{return_node}()
//     }}
// }}"#
//         )?;
//         Ok(())
//     }
// }

// impl RenderType for RsNodeMetasRenderer {
//     fn render(
//         &self,
//         renderer: &mut TypeRenderer,
//         cursor: &mut VisitCursor,
//     ) -> anyhow::Result<String> {
//         use heck::ToPascalCase;
//
//         let name = match cursor.node.clone().deref() {
//             TypeNode::Any { .. } => unimplemented!("Any type support not implemented"),
//             TypeNode::Boolean { .. }
//             | TypeNode::Float { .. }
//             | TypeNode::Integer { .. }
//             | TypeNode::String { .. }
//             | TypeNode::File { .. } => "scalar".into(),
//             // list and optional node just return the meta of the wrapped type
//             TypeNode::Optional {
//                 data: OptionalTypeData { item, .. },
//                 ..
//             }
//             | TypeNode::List {
//                 data: ListTypeData { items: item, .. },
//                 ..
//             } => renderer
//                 .render_subgraph(*item, cursor)?
//                 .0
//                 .unwrap()
//                 .to_string(),
//             TypeNode::Function { data, base } => {
//                 let (return_ty_name, _cyclic) = renderer.render_subgraph(data.output, cursor)?;
//                 let return_ty_name = return_ty_name.unwrap();
//                 let props = match renderer.nodes[data.input as usize].deref() {
//                     TypeNode::Object { data, .. } if !data.properties.is_empty() => {
//                         let props = data
//                             .properties
//                             .iter()
//                             // generate property types first
//                             .map(|(name, &dep_id)| {
//                                 eyre::Ok((name.clone(), self.name_mapper.name_for(dep_id)))
//                             })
//                             .collect::<Result<IndexMap<_, _>, _>>()?;
//                         Some(props)
//                     }
//                     _ => None,
//                 };
//                 let node_name = &base.title;
//                 let ty_name = normalize_type_title(node_name).to_pascal_case();
//                 let input_files = self
//                     .input_files
//                     .get(&cursor.id)
//                     .map(|files| {
//                         files
//                             .iter()
//                             // .map(|path| {
//                             //     path.0
//                             //         .iter()
//                             //         .map(|s| serde_json::to_string(&s).unwrap())
//                             //         .collect::<Vec<_>>()
//                             // })
//                             .map(|path| path.serialize_rs())
//                             .collect::<Vec<_>>()
//                     })
//                     .map(|files| {
//                         (!files.is_empty()).then(|| format!("[TypePath({})]", files.join(", ")))
//                     })
//                     .unwrap_or_default();
//                 self.render_for_func(renderer, &ty_name, &return_ty_name, props, input_files)?;
//                 ty_name
//             }
//             TypeNode::Object { data, base } => {
//                 let props = data
//                     .properties
//                     .iter()
//                     // generate property types first
//                     .map(|(name, &dep_id)| {
//                         let (ty_name, _cyclic) = renderer.render_subgraph(dep_id, cursor)?;
//                         let ty_name = ty_name.unwrap();
//                         eyre::Ok((name.clone(), ty_name))
//                     })
//                     .collect::<Result<IndexMap<_, _>, _>>()?;
//                 let node_name = &base.title;
//                 let ty_name = normalize_type_title(node_name).to_pascal_case();
//                 self.render_for_object(renderer, &ty_name, props)?;
//                 ty_name
//             }
//             TypeNode::Either {
//                 data: EitherTypeData { one_of: variants },
//                 base,
//             }
//             | TypeNode::Union {
//                 data: UnionTypeData { any_of: variants },
//                 base,
//             } => {
//                 let mut named_set = vec![];
//                 let variants = variants
//                     .iter()
//                     .filter_map(|&inner| {
//                         if !renderer.is_composite(inner) {
//                             return None;
//                         }
//                         named_set.push(inner);
//                         let (ty_name, _cyclic) = match renderer.render_subgraph(inner, cursor) {
//                             Ok(val) => val,
//                             Err(err) => return Some(Err(err)),
//                         };
//                         let ty_name = ty_name.unwrap();
//                         Some(eyre::Ok((
//                             renderer.nodes[inner as usize].deref().base().title.clone(),
//                             ty_name,
//                         )))
//                     })
//                     .collect::<Result<IndexMap<_, _>, _>>()?;
//                 if !variants.is_empty() {
//                     {
//                         let mut named_types = self.named_types.lock().unwrap();
//                         named_types.extend(named_set)
//                     }
//                     let ty_name = normalize_type_title(&base.title);
//                     self.render_for_union(renderer, &ty_name, variants)?;
//                     ty_name
//                 } else {
//                     "scalar".into()
//                 }
//             }
//         };
//         Ok(name)
//     }
// }

#[derive(Debug)]
pub enum RsNodeMetasSpec {
    Scalar,
    Alias {
        target: TypeKey,
    },
    Object {
        props: IndexMap<Arc<str>, TypeKey>,
        name: String,
    },
    Union {
        variants: IndexMap<Arc<str>, TypeKey>,
        name: String,
    },
    Function {
        return_ty: TypeKey,
        argument_fields: Option<IndexMap<Arc<str>, TypeKey>>,
        input_files: Option<String>,
        name: String,
    },
}

impl TypeRenderer for RsNodeMetasSpec {
    fn render(
        &self,
        out: &mut impl Write,
        page: &ManifestPage<Self>,
        memo: &impl NameMemo,
    ) -> std::fmt::Result {
        match self {
            Self::Alias { .. } | Self::Scalar => {}
            Self::Object { props, name } => {
                self.render_for_object(page, memo, out, name, &props)?;
            }
            Self::Union { variants, name } => {
                self.render_for_union(page, memo, out, name, &variants)?;
            }
            Self::Function {
                return_ty,
                argument_fields,
                input_files,
                name,
            } => {
                self.render_for_func(
                    page,
                    memo,
                    out,
                    name,
                    *return_ty,
                    argument_fields.clone(),
                    input_files.clone(),
                )?;
            }
        }

        Ok(())
    }

    fn get_reference_expr(
        &self,
        page: &ManifestPage<Self>,
        memo: &impl NameMemo,
    ) -> Option<String> {
        match self {
            Self::Alias { target } => page.get_ref(target, memo),
            Self::Scalar => Some("scalar".to_string()),
            Self::Function { name, .. } => Some(name.clone()),
            Self::Object { name, .. } => Some(name.clone()),
            Self::Union { name, .. } => Some(name.clone()),
        }
    }
}

impl RsNodeMetasSpec {
    pub fn render_for_object(
        &self,
        page: &ManifestPage<Self>,
        memo: &impl NameMemo,
        dest: &mut impl Write,
        ty_name: &str,
        props: &IndexMap<Arc<str>, TypeKey>,
    ) -> std::fmt::Result {
        write!(
            dest,
            r#"
pub fn {ty_name}() -> NodeMeta {{
    NodeMeta {{
        arg_types: None,
        variants: None,
        sub_nodes: Some(
            ["#
        )?;
        for (key, prop) in props {
            let node_ref = page.get_ref(prop, memo).unwrap();
            write!(
                dest,
                r#"
                ("{key}".into(), {node_ref} as NodeMetaFn),"#
            )?;
        }
        write!(
            dest,
            r#"
            ].into()
        ),
        input_files: None,
    }}
}}"#
        )?;
        Ok(())
    }

    pub fn render_for_union(
        &self,
        page: &ManifestPage<Self>,
        memo: &impl NameMemo,
        dest: &mut impl Write,
        ty_name: &str,
        props: &IndexMap<Arc<str>, TypeKey>,
    ) -> std::fmt::Result {
        write!(
            dest,
            r#"
pub fn {ty_name}() -> NodeMeta {{
    NodeMeta {{
        arg_types: None,
        sub_nodes: None,
        variants: Some(
            ["#
        )?;
        for (key, prop) in props {
            let node_ref = page.get_ref(prop, memo).unwrap();
            write!(
                dest,
                r#"
                ("{key}".into(), {node_ref} as NodeMetaFn),"#
            )?;
        }
        write!(
            dest,
            r#"
            ].into()
        ),
        input_files: None,
    }}
}}"#
        )?;
        Ok(())
    }

    pub fn render_for_func(
        &self,
        page: &ManifestPage<Self>,
        memo: &impl NameMemo,
        dest: &mut impl Write,
        ty_name: &str,
        return_node: TypeKey,
        argument_fields: Option<IndexMap<Arc<str>, TypeKey>>,
        input_files: Option<String>,
    ) -> std::fmt::Result {
        write!(
            dest,
            r#"
pub fn {ty_name}() -> NodeMeta {{
    NodeMeta {{"#
        )?;
        if let Some(fields) = argument_fields {
            write!(
                dest,
                r#"
        arg_types: Some(
            ["#
            )?;

            for (key, ty) in fields {
                let ty = page.get_ref(&ty, memo).unwrap();
                write!(
                    dest,
                    r#"
                ("{key}".into(), "{ty}".into()),"#
                )?;
            }

            write!(
                dest,
                r#"
            ].into()
        ),"#
            )?;
        }
        if let Some(input_files) = input_files {
            write!(
                dest,
                r#"
        input_files: Some(PathToInputFiles(&{input_files})),"#
            )?;
        }
        let return_node = page.get_ref(&return_node, memo).unwrap();
        write!(
            dest,
            r#"
        ..{return_node}()
    }}
}}"#
        )?;
        Ok(())
    }
}

pub struct PageBuilder {
    tg: Arc<Typegraph>,
    queue: RefCell<Vec<TypeKey>>,
}

impl PageBuilder {
    pub fn new(tg: Arc<Typegraph>, metas: &IndexSet<TypeKey>) -> Self {
        Self {
            tg,
            queue: RefCell::new(metas.iter().copied().collect()),
        }
    }

    fn enqueue(&self, key: TypeKey) {
        self.queue.borrow_mut().push(key);
    }

    pub fn build(self) -> ManifestPage<RsNodeMetasSpec> {
        let mut map = IndexMap::new();

        loop {
            let next = {
                let mut queue = self.queue.borrow_mut();
                queue.pop()
            };

            if let Some(key) = next {
                if !map.contains_key(&key) {
                    continue;
                }
                map.insert(key, self.get_spec(key));
            } else {
                break;
            }
        }

        map.into()
    }

    fn get_spec(&self, key: TypeKey) -> RsNodeMetasSpec {
        let ty = self.tg.find_type(key).unwrap();
        match ty {
            Type::Boolean(_)
            | Type::Float(_)
            | Type::Integer(_)
            | Type::String(_)
            | Type::File(_) => RsNodeMetasSpec::Scalar,
            Type::Optional(ty) => self.alias(ty.item().key()),
            Type::List(ty) => self.alias(ty.item().unwrap().key()),
            Type::Union(ty) => self.get_union_spec(key, ty.clone()),
            Type::Function(ty) => self.get_func_spec(key, ty.clone()),
            Type::Object(ty) => self.get_object_spec(key, ty.clone()),
        }
    }

    fn alias(&self, key: TypeKey) -> RsNodeMetasSpec {
        self.enqueue(key);
        RsNodeMetasSpec::Alias { target: key }
    }

    fn get_func_spec(&self, key: TypeKey, ty: Arc<FunctionType>) -> RsNodeMetasSpec {
        let out_key = ty.output().key();
        self.enqueue(out_key);

        let props = ty.input().properties();
        let props = (!props.is_empty()).then(|| {
            props
                .iter()
                .map(|(name, prop)| (name.clone(), prop.type_.key()))
                .collect::<IndexMap<_, _>>()
        });

        // TODO input_files

        RsNodeMetasSpec::Function {
            return_ty: out_key,
            argument_fields: props,
            input_files: None,
            name: normalize_type_title(&ty.name()),
        }
    }

    fn get_union_spec(&self, key: TypeKey, ty: Arc<UnionType>) -> RsNodeMetasSpec {
        // let mut named_set = vec![];
        let variants: IndexMap<_, _> = ty
            .variants()
            .iter()
            .filter_map(|variant| {
                if !is_composite(variant) {
                    return None;
                }
                // named_set.push(variant.key());
                self.enqueue(variant.key());
                Some((variant.name(), variant.key()))
            })
            .collect();
        if !variants.is_empty() {
            let name = normalize_type_title(&ty.name());
            // TODO named_types???
            RsNodeMetasSpec::Union { variants, name }
        } else {
            RsNodeMetasSpec::Scalar
        }
    }

    fn get_object_spec(&self, key: TypeKey, ty: Arc<ObjectType>) -> RsNodeMetasSpec {
        let props = ty.properties();
        let props = props
            .iter()
            .map(|(name, prop)| {
                let prop_key = prop.type_.key();
                self.enqueue(prop_key);
                (name.clone(), prop_key)
            })
            .collect::<IndexMap<_, _>>();

        RsNodeMetasSpec::Object {
            props,
            name: normalize_type_title(&ty.name()),
        }
    }
}
