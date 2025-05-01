// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{Edge, EdgeKind, Type, TypeBase, TypeNode, TypeNodeExt as _, WeakType, Wrap as _};
use crate::conv::dedup::{DupKey, DuplicationKeyGenerator};
use crate::conv::interlude::*;
use crate::conv::key::TypeKeyEx;
use crate::{interlude::*, Arc, Once};

#[derive(Debug)]
pub struct ListType {
    pub base: TypeBase,
    pub(crate) item: Once<Type>,
    pub min_items: Option<u32>,
    pub max_items: Option<u32>,
    pub unique_items: bool,
}

impl ListType {
    pub fn item(&self) -> &Type {
        self.item.get().expect("item type uninitialized on list")
    }
}

pub struct LinkList<K: DupKey> {
    pub ty: Arc<ListType>,
    pub item: TypeKeyEx<K>,
}

impl<K: DupKey> LinkList<K> {
    pub fn link<G: DuplicationKeyGenerator<Key = K>>(
        self,
        map: &crate::conv::ConversionMap<G>,
    ) -> Result<()> {
        self.ty
            .item
            .set(
                map.get_ex(self.item).ok_or_else(|| {
                    eyre!("cannot find item type for list; key={:?}", self.ty.key())
                })?,
            )
            .map_err(|_| {
                eyre!(
                    "OnceLock: cannot set list item more than once; key={:?}",
                    self.ty.key()
                )
            })
    }
}

impl TypeNode for Arc<ListType> {
    fn base(&self) -> &TypeBase {
        &self.base
    }

    fn tag(&self) -> &'static str {
        "list"
    }

    fn children(&self) -> Vec<Type> {
        vec![self.item().clone()]
    }

    fn edges(&self) -> Vec<Edge> {
        vec![Edge {
            from: WeakType::List(Arc::downgrade(self)),
            to: self.item().clone(),
            kind: EdgeKind::ListItem,
        }]
    }
}

// pub(crate) fn convert_list<G: DuplicationKeyGenerator>(
//     base: TypeBase,
//     data: &tg_schema::ListTypeData,
//     rpath: RelativePath,
// ) -> Box<dyn TypeConversionResult<G>> {
//     let ty = ListType {
//         base,
//         item: Default::default(),
//         min_items: data.min_items,
//         max_items: data.max_items,
//         unique_items: data.unique_items.unwrap_or(false),
//     }
//     .into();
//
//     Box::new(ListTypeConversionResult {
//         ty,
//         item_idx: data.items,
//         rpath,
//     })
// }
//
// pub struct ListTypeConversionResult {
//     ty: Arc<ListType>,
//     item_idx: u32,
//     rpath: RelativePath,
// }
//
// impl<G: DuplicationKeyGenerator> TypeConversionResult<G> for ListTypeConversionResult {
//     fn get_type(&self) -> Type {
//         self.ty.clone().wrap()
//     }
//
//     fn finalize(&mut self, conv: &mut Conversion<G>) -> Result<()> {
//         let mut item = conv.convert_type(
//             self.ty.clone().wrap().downgrade(),
//             self.item_idx,
//             self.rpath.push(PathSegment::ListItem)?,
//         )?;
//
//         self.ty.item.set(item.get_type()).map_err(|_| {
//             eyre!(
//                 "OnceLock: cannot set list item more than once; key={:?}",
//                 self.ty.key()
//             )
//         })?;
//
//         item.finalize(conv)?;
//         Ok(())
//     }
// }
