// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{Edge, EdgeKind, Type, TypeBase, TypeNode, WeakType};
use crate::{conv::interlude::*, Arc, Lazy};

#[derive(Debug)]
pub struct ListType {
    pub base: TypeBase,
    pub(crate) item: Lazy<Type>,
    pub min_items: Option<u32>,
    pub max_items: Option<u32>,
    pub unique_items: bool,
}

impl ListType {
    pub fn item(&self) -> &Type {
        self.item.get().expect("uninitialized")
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

pub(crate) fn convert_list(
    parent: WeakType,
    type_idx: u32,
    key: TypeKey,
    rpath: RelativePath,
    base: &tg_schema::TypeNodeBase,
    data: &tg_schema::ListTypeData,
) -> Box<dyn TypeConversionResult> {
    let ty = Type::List(
        ListType {
            base: Conversion::base(key, parent, type_idx, base),
            item: Default::default(),
            min_items: data.min_items,
            max_items: data.max_items,
            unique_items: data.unique_items.unwrap_or(false),
        }
        .into(),
    );

    Box::new(ListTypeConversionResult {
        ty,
        item_idx: data.items,
        rpath,
    })
}

pub struct ListTypeConversionResult {
    ty: Type,
    item_idx: u32,
    rpath: RelativePath,
}

impl TypeConversionResult for ListTypeConversionResult {
    fn get_type(&self) -> Type {
        self.ty.clone()
    }

    fn finalize(&mut self, conv: &mut Conversion) {
        let mut item = conv.convert_type(
            self.ty.downgrade(),
            self.item_idx,
            self.rpath.push(PathSegment::ListItem),
        );
        match &self.ty {
            Type::List(list) => {
                list.item.set(item.get_type()).unwrap();
            }
            _ => unreachable!(),
        }

        item.finalize(conv);
    }
}
