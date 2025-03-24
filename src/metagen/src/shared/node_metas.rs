// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::cell::RefCell;

use typegraph::TypeNodeExt as _;

use crate::interlude::*;

use super::manifest::{ManifestEntry, ManifestPage};

pub trait MetaFactory<M> {
    fn build_meta(&self, ty: Type) -> M;
}

pub struct MetasPageBuilder {
    pub tg: Arc<Typegraph>,
    stack: RefCell<Vec<Type>>,
}

impl MetasPageBuilder {
    pub fn new(tg: Arc<Typegraph>) -> Result<Self> {
        let mut stack = vec![];
        for root_fn in tg.root_functions() {
            let (_, func_ty) = root_fn?;
            stack.push(func_ty.wrap());
        }
        let stack = RefCell::new(stack);
        Ok(Self { tg, stack })
    }

    pub fn push(&self, ty: Type) {
        self.stack.borrow_mut().push(ty);
    }
}
impl MetasPageBuilder {
    pub fn build<M>(self) -> ManifestPage<M>
    where
        M: ManifestEntry<Extras = ()>,
        Self: MetaFactory<M>,
    {
        let mut map = IndexMap::new();

        loop {
            let next = {
                let mut stack = self.stack.borrow_mut();
                stack.pop()
            };

            if let Some(ty) = next {
                if map.contains_key(&ty.key()) {
                    continue;
                }
                map.insert(ty.key(), self.build_meta(ty.clone()));
                // for child_ty in ty.children() {
                //     self.stack.borrow_mut().push(child_ty);
                // }
            } else {
                break;
            }
        }

        let res: ManifestPage<M> = map.into();
        res.cache_references();

        res
    }
}
