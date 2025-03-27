// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{Edge, EdgeKind, Type, TypeBase, TypeNode, WeakType, Wrap as _};
use crate::conv::interlude::*;
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

pub(crate) fn convert_union(
    parent: WeakType,
    key: TypeKey,
    rpath: RelativePath,
    base: &tg_schema::TypeNodeBase,
    variants: &[u32],
    schema: &tg_schema::Typegraph,
    either: bool,
) -> Box<dyn TypeConversionResult> {
    let ty = UnionType {
        base: Conversion::base(key, parent, rpath.clone(), base, schema),
        variants: Default::default(),
        either,
    }
    .into();

    Box::new(UnionTypeConversionResult {
        ty,
        variants: variants.to_vec(),
        rpath,
    })
}

pub struct UnionTypeConversionResult {
    ty: Arc<UnionType>,
    variants: Vec<u32>,
    rpath: RelativePath,
}

impl TypeConversionResult for UnionTypeConversionResult {
    fn get_type(&self) -> Type {
        self.ty.clone().wrap()
    }

    fn finalize(&mut self, conv: &mut Conversion) -> Result<()> {
        let mut variants = Vec::with_capacity(self.variants.len());
        let weak = self.ty.clone().wrap().downgrade();
        for (i, &idx) in self.variants.iter().enumerate() {
            let rpath = self.rpath.push(PathSegment::UnionVariant(i as u32))?;
            let mut res = conv.convert_type(weak.clone(), idx, rpath)?;
            variants.push(res.get_type());
            res.finalize(conv)?
        }

        self.ty.variants.set(variants).map_err(|_| {
            eyre!(
                "OnceLock: cannot set union variants more than once; key={:?}",
                self.ty.key()
            )
        })?;

        Ok(())
    }
}
