// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::interlude::*;
use crate::interlude::*;

#[derive(derive_more::Debug)]
pub struct UnionType {
    pub base: TypeBase,
    #[debug("{:?}", variants.get().map(|i| i.iter().map(|v| v.tag()).collect::<Vec<_>>()))]
    pub(crate) variants: OnceLock<Vec<Type>>,
    pub either: bool,
}

impl UnionType {
    pub fn variants(&self) -> &[Type] {
        self.variants
            .get()
            .expect("variants uninitialized on union")
    }
}

pub struct LinkUnion<K: DupKey> {
    pub ty: Arc<UnionType>,
    pub variants: Vec<TypeKeyEx<K>>,
}

impl<K: DupKey> LinkUnion<K> {
    pub fn link<G: DuplicationEngine<Key = K>>(self, map: &ConversionMap<G>) -> Result<()> {
        let mut variants = Vec::with_capacity(self.variants.len());
        for (i, key) in self.variants.into_iter().enumerate() {
            let ty = map.get_ex(key).ok_or_else(|| {
                eyre!(
                    "cannot find variant type for union; key={:?}, variant={}",
                    self.ty.key(),
                    i
                )
            })?;
            variants.push(ty);
        }
        self.ty.variants.set(variants).map_err(|_| {
            eyre!(
                "OnceLock: cannot set union variants more than once; key={:?}",
                self.ty.key()
            )
        })
    }
}

impl TypeNode for Arc<UnionType> {
    fn base(&self) -> &TypeBase {
        &self.base
    }

    fn tag(&self) -> &'static str {
        if self.either {
            "either"
        } else {
            "union"
        }
    }

    fn children(&self) -> Vec<Type> {
        self.variants().to_vec()
    }

    fn edges(&self) -> Vec<Edge> {
        self.variants()
            .iter()
            .enumerate()
            .map(|(v, t)| Edge {
                from: WeakType::Union(Arc::downgrade(self)),
                to: t.clone(),
                kind: EdgeKind::UnionVariant(v),
            })
            .collect()
    }
}
