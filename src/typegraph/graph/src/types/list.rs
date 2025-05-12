// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::interlude::*;
use crate::interlude::*;

#[derive(derive_more::Debug)]
pub struct ListType {
    pub base: TypeBase,
    #[debug("{:?}", item.get().map(|ty| ty.tag()))]
    pub(crate) item: OnceLock<Type>,
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
    pub fn link<G: DuplicationEngine<Key = K>>(
        self,
        map: &crate::expansion::ConversionMap<G>,
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
