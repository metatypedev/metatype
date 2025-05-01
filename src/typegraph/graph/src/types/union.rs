// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{Edge, EdgeKind, Type, TypeBase, TypeNode, WeakType, Wrap as _};
use crate::conv::dedup::{DupKey, DuplicationKeyGenerator};
use crate::conv::interlude::*;
use crate::conv::key::TypeKeyEx;
use crate::{interlude::*, TypeNodeExt as _};
use crate::{Arc, Once};

#[derive(Debug)]
pub struct UnionType {
    pub base: TypeBase,
    pub(crate) variants: Once<Vec<Type>>,
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
    pub fn link<G: DuplicationKeyGenerator<Key = K>>(
        self,
        map: &crate::conv::ConversionMap<G>,
    ) -> Result<()> {
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

// pub(crate) fn convert_union<G: DuplicationKeyGenerator>(
//     base: TypeBase,
//     variants: &[u32],
//     rpath: RelativePath,
//     either: bool,
// ) -> Box<dyn TypeConversionResult<G>> {
//     let ty = UnionType {
//         base,
//         variants: Default::default(),
//         either,
//     }
//     .into();
//
//     Box::new(UnionTypeConversionResult {
//         ty,
//         variants: variants.to_vec(),
//         rpath,
//     })
// }
//
// pub struct UnionTypeConversionResult {
//     ty: Arc<UnionType>,
//     variants: Vec<u32>,
//     rpath: RelativePath,
// }
//
// impl<G: DuplicationKeyGenerator> TypeConversionResult<G> for UnionTypeConversionResult {
//     fn get_type(&self) -> Type {
//         self.ty.clone().wrap()
//     }
//
//     fn finalize(&mut self, conv: &mut Conversion<G>) -> Result<()> {
//         let mut variants = Vec::with_capacity(self.variants.len());
//         let weak = self.ty.clone().wrap().downgrade();
//         for (i, &idx) in self.variants.iter().enumerate() {
//             let rpath = self.rpath.push(PathSegment::UnionVariant(i as u32))?;
//             let mut res = conv.convert_type(weak.clone(), idx, rpath)?;
//             variants.push(res.get_type());
//             res.finalize(conv)?
//         }
//
//         self.ty.variants.set(variants).map_err(|_| {
//             eyre!(
//                 "OnceLock: cannot set union variants more than once; key={:?}",
//                 self.ty.key()
//             )
//         })?;
//
//         Ok(())
//     }
// }
