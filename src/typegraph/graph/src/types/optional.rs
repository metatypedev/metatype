// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{Edge, EdgeKind, Type, TypeBase, TypeNode, WeakType};
use crate::{conv::interlude::*, Arc, Lazy};

#[derive(Debug)]
pub struct OptionalType {
    pub base: TypeBase,
    pub(crate) item: Lazy<Type>,
    pub default_value: Option<serde_json::Value>,
}

impl OptionalType {
    pub fn item(&self) -> &Type {
        self.item.get().expect("uninitialized")
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
    type_idx: u32,
    key: TypeKey,
    rpath: RelativePath,
    base: &tg_schema::TypeNodeBase,
    data: &tg_schema::OptionalTypeData,
) -> Box<dyn TypeConversionResult> {
    let ty = Type::Optional(
        OptionalType {
            base: Conversion::base(key, parent, type_idx, base),
            item: Default::default(),
            default_value: data.default_value.clone(),
        }
        .into(),
    );

    Box::new(OptionalTypeConversionResult {
        ty,
        item_idx: data.item,
        rpath,
    })
}

pub struct OptionalTypeConversionResult {
    ty: Type,
    item_idx: u32,
    rpath: RelativePath,
}

impl TypeConversionResult for OptionalTypeConversionResult {
    fn get_type(&self) -> Type {
        self.ty.clone()
    }

    fn finalize(&mut self, conv: &mut Conversion) {
        let mut item = conv.convert_type(
            self.ty.downgrade(),
            self.item_idx,
            self.rpath.push(PathSegment::OptionalItem),
        );
        match &self.ty {
            Type::Optional(opt) => {
                // TODO error handling
                opt.item.set(item.get_type()).unwrap();
            }
            _ => unreachable!(),
        }

        item.finalize(conv)
    }
}
