// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{Edge, EdgeKind, Type, TypeBase, TypeNode, WeakType};
use crate::conv::interlude::*;
use crate::{interlude::*, TypeNodeExt as _};
use crate::{Arc, Lazy};

#[derive(Debug)]
pub struct UnionType {
    pub base: TypeBase,
    pub(crate) variants: Lazy<Vec<Type>>,
    pub either: bool,
}

impl UnionType {
    pub fn variants(&self) -> &Vec<Type> {
        self.variants.get().expect("uninitialized")
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

    fn children(&self) -> Result<Vec<Type>> {
        Ok(self.variants().clone())
    }

    fn edges(&self) -> Result<Vec<Edge>> {
        Ok(self
            .variants()
            .iter()
            .enumerate()
            .map(|(v, t)| Edge {
                from: WeakType::Union(Arc::downgrade(self)),
                to: t.clone(),
                kind: EdgeKind::UnionVariant(v),
            })
            .collect())
    }
}

pub(crate) fn convert_union(
    parent: WeakType,
    key: TypeKey,
    rpath: RelativePath,
    base: &tg_schema::TypeNodeBase,
    variants: &[u32],
    either: bool,
) -> Box<dyn TypeConversionResult> {
    let ty = Type::Union(
        UnionType {
            base: Conversion::base(key, parent, base),
            variants: Default::default(),
            either,
        }
        .into(),
    );

    Box::new(UnionTypeConversionResult {
        ty,
        variants: variants.to_vec(),
        rpath,
    })
}

pub struct UnionTypeConversionResult {
    ty: Type,
    variants: Vec<u32>, // TODO reference
    rpath: RelativePath,
}

impl TypeConversionResult for UnionTypeConversionResult {
    fn get_type(&self) -> Type {
        self.ty.clone()
    }

    fn finalize(&mut self, conv: &mut Conversion) -> Result<()> {
        let mut variants = Vec::with_capacity(self.variants.len());
        let mut results = Vec::with_capacity(self.variants.len());
        let weak = self.ty.downgrade();
        for (i, &idx) in self.variants.iter().enumerate() {
            let rpath = self.rpath.push(PathSegment::UnionVariant(i as u32));
            let res = conv.convert_type(weak.clone(), idx, rpath)?;
            variants.push(res.get_type());
            results.push(res);
        }

        match &self.ty {
            Type::Union(union) => union.variants.set(variants).map_err(|_| {
                eyre!(
                    "OnceLock: cannot set union variants more than once; key={:?}",
                    self.ty.key()
                )
            })?,
            _ => unreachable!(),
        }

        for mut res in results {
            res.finalize(conv)?;
        }

        Ok(())
    }
}
