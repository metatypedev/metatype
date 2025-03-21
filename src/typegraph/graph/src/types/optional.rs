// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{Edge, EdgeKind, Type, TypeBase, TypeNode, WeakType, Wrap as _};
use crate::{conv::interlude::*, Arc, Lazy};
use crate::{interlude::*, TypeNodeExt as _};

#[derive(Debug)]
pub struct OptionalType {
    pub base: TypeBase,
    pub(crate) item: Lazy<Type>,
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

pub(crate) fn convert_optional(
    parent: WeakType,
    key: TypeKey,
    rpath: RelativePath,
    base: &tg_schema::TypeNodeBase,
    data: &tg_schema::OptionalTypeData,
    schema: &tg_schema::Typegraph,
) -> Box<dyn TypeConversionResult> {
    let ty = OptionalType {
        base: Conversion::base(key, parent, rpath.clone(), base, schema),
        item: Default::default(),
        default_value: data.default_value.clone(),
    }
    .into();

    Box::new(OptionalTypeConversionResult {
        ty,
        item_idx: data.item,
        rpath,
    })
}

pub struct OptionalTypeConversionResult {
    ty: Arc<OptionalType>,
    item_idx: u32,
    rpath: RelativePath,
}

impl TypeConversionResult for OptionalTypeConversionResult {
    fn get_type(&self) -> Type {
        self.ty.clone().wrap()
    }

    fn finalize(&mut self, conv: &mut Conversion) -> Result<()> {
        let mut item = conv.convert_type(
            self.ty.clone().wrap().downgrade(),
            self.item_idx,
            self.rpath.push(PathSegment::OptionalItem)?,
        )?;

        item.finalize(conv)?;

        self.ty.item.set(item.get_type()).map_err(|_| {
            eyre!(
                "OnceLock: cannot set optional item more than once; key={:?}",
                self.ty.key()
            )
        })?;

        Ok(())
    }
}
