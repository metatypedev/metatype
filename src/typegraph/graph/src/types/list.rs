// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{Edge, EdgeKind, Type, TypeBase, TypeNode, TypeNodeExt as _, WeakType};
use crate::{conv::interlude::*, interlude::*, Arc, Lazy};

#[derive(Debug)]
pub struct ListType {
    pub base: TypeBase,
    pub(crate) item: Lazy<Type>,
    pub min_items: Option<u32>,
    pub max_items: Option<u32>,
    pub unique_items: bool,
}

impl ListType {
    pub fn item(&self) -> Result<&Type> {
        match self.item.get() {
            Some(item) => Ok(item),
            None => bail!(
                "list item uninitialized: key={:?}; parent_key={:?}",
                self.base.key,
                self.base.parent.upgrade().unwrap().key()
            ),
        }
    }
}

impl TypeNode for Arc<ListType> {
    fn base(&self) -> &TypeBase {
        &self.base
    }

    fn tag(&self) -> &'static str {
        "list"
    }

    fn children(&self) -> Result<Vec<Type>> {
        Ok(vec![self.item()?.clone()])
    }

    fn edges(&self) -> Vec<Edge> {
        vec![Edge {
            from: WeakType::List(Arc::downgrade(self)),
            to: self.item().unwrap().clone(),
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
    eprintln!("convert_list: #{key:?}");
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
        eprintln!("finalize list: #{:?}", self.ty.key());
        let mut item = conv.convert_type(
            self.ty.downgrade(),
            self.item_idx,
            self.rpath.push(PathSegment::ListItem),
        );
        match &self.ty {
            Type::List(list) => {
                eprintln!("finalize list: #{:?}: set item", self.ty.key());
                list.item.set(item.get_type()).unwrap();
            }
            _ => unreachable!(),
        }

        eprintln!("finalize list: #{:?}: finalize item", self.ty.key());
        item.finalize(conv);
    }
}
