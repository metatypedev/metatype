// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::interlude::*;
use crate::interlude::*;

#[derive(derive_more::Debug)]
pub struct OptionalType {
    pub base: TypeBase,
    #[debug("{}", item.get().map(|ty| ty.tag()).unwrap_or("<unset>"))]
    pub(crate) item: OnceLock<Type>,
    pub default_value: Option<serde_json::Value>,
}

impl OptionalType {
    pub fn item(&self) -> &Type {
        self.item
            .get()
            .expect("item type uninitialized on optional")
    }
}

impl TypeNode for Arc<OptionalType> {
    fn base(&self) -> &TypeBase {
        &self.base
    }

    fn tag(&self) -> &'static str {
        "optional"
    }

    fn children(&self) -> Vec<Type> {
        vec![self.item().clone()]
    }

    fn edges(&self) -> Vec<Edge> {
        vec![Edge {
            from: WeakType::Optional(Arc::downgrade(self)),
            to: self.item().clone(),
            kind: EdgeKind::OptionalItem,
        }]
    }
}

pub struct LinkOptional<K: DupKey> {
    pub ty: Arc<OptionalType>,
    pub item: TypeKeyEx<K>,
}

impl<K: DupKey> LinkOptional<K> {
    pub fn link<G: DuplicationEngine<Key = K>>(self, map: &ConversionMap<G>) -> Result<()> {
        self.ty
            .item
            .set(map.get_ex(self.item).ok_or_else(|| {
                eyre!(
                    "cannot find item type for optional; key={:?}",
                    self.ty.key()
                )
            })?)
            .map_err(|_| {
                eyre!(
                    "OnceLock: cannot set optional item more than once; key={:?}",
                    self.ty.key()
                )
            })
    }
}
