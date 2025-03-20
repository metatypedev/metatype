// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::cell::RefCell;

use typegraph::TypeNodeExt as _;

use crate::interlude::*;

use super::manifest::{ManifestPage, TypeRenderer};

pub trait MetaFactory<M> {
    fn build_meta(&self, key: TypeKey) -> M;
}

pub struct MetasPageBuilder {
    pub tg: Arc<Typegraph>,
    stack: RefCell<Vec<TypeKey>>,
}

impl MetasPageBuilder {
    pub fn new(tg: Arc<Typegraph>) -> Result<Self> {
        let mut stack = vec![];
        for root_fn in tg.root_functions() {
            let (_, func_ty) = root_fn?;
            stack.push(func_ty.key());
        }
        let stack = RefCell::new(stack);
        Ok(Self { tg, stack })
    }

    pub fn push(&self, key: TypeKey) {
        self.stack.borrow_mut().push(key);
    }
}
impl MetasPageBuilder {
    pub fn build<M>(self) -> ManifestPage<M>
    where
        M: TypeRenderer,
        Self: MetaFactory<M>,
    {
        let mut map = IndexMap::new();

        loop {
            let next = {
                let mut stack = self.stack.borrow_mut();
                stack.pop()
            };

            if let Some(key) = next {
                if map.contains_key(&key) {
                    continue;
                }
                map.insert(key, self.build_meta(key));
            } else {
                break;
            }
        }

        map.into()
    }
}
