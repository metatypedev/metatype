// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{collections::HashMap, rc::Rc};

use crate::errors::Result;
use crate::global_store::Store;
use crate::types::{TypeDef, TypeDefExt as _, TypeId};

use super::Type;

mod as_id;
mod resolve_ref;

pub use as_id::{AsId, IdKind};
pub use resolve_ref::ResolveRef;

#[derive(Clone, Debug)]
pub enum RefTarget {
    Direct(TypeDef),
    Indirect(String),
}
// impl RefTarget {
//     fn as_indirect(&self) -> Option<&str> {
//         match self {
//             RefTarget::Indirect(name) => Some(name),
//             _ => None,
//         }
//     }
// }

// TODO: merge rules?
#[derive(Clone, Debug, Default)]
pub struct RefAttrs(pub Option<Rc<RefAttrsInner>>);

pub type RefAttrsInner = HashMap<String, String>;

impl From<HashMap<String, String>> for RefAttrs {
    fn from(attrs: HashMap<String, String>) -> Self {
        if attrs.is_empty() {
            RefAttrs::default()
        } else {
            Self(Some(Rc::new(attrs)))
        }
    }
}

impl RefAttrs {
    pub fn iter(&self) -> impl Iterator<Item = (&'_ String, &'_ String)> {
        self.0.iter().flat_map(|it| it.iter())
    }

    pub fn get(&self, key: &str) -> Option<&str> {
        self.0
            .as_ref()
            .and_then(|it| it.get(key))
            .map(|it| it.as_str())
    }
}

impl RefAttrs {
    pub fn merge(&self, other: impl Iterator<Item = (String, String)>) -> Self {
        if other.size_hint().0 == 0 {
            return self.clone();
        }
        let mut attrs = self.0.clone().map(|it| (*it).clone()).unwrap_or_default();
        for (k, v) in other {
            attrs.insert(k, v);
        }
        attrs.into()
    }

    pub fn with_target(&self, target: RefTarget) -> TypeRefBuilder {
        TypeRefBuilder {
            target,
            attributes: self.clone(),
        }
    }
}

impl From<Vec<(String, String)>> for RefAttrs {
    fn from(attrs: Vec<(String, String)>) -> Self {
        attrs.into_iter().collect::<HashMap<_, _>>().into()
    }
}

#[derive(Clone, Debug)]
pub struct TypeRef {
    pub id: TypeId,
    pub target: RefTarget,
    pub attributes: RefAttrs,
}

pub struct TypeRefBuilder {
    target: RefTarget,
    attributes: RefAttrs,
}

impl TypeRefBuilder {
    pub fn with_id(self, id: TypeId) -> TypeRef {
        TypeRef {
            id,
            target: self.target,
            attributes: self.attributes,
        }
    }
}

impl TypeRef {
    pub fn new(
        target: Type,
        attributes: impl IntoIterator<Item = (String, String)>,
    ) -> Result<TypeRef> {
        match target {
            Type::Ref(type_ref) => {
                let attributes = type_ref.attributes.merge(attributes.into_iter());
                Store::register_type_ref(attributes.with_target(type_ref.target))
            }
            Type::Def(type_def) => Store::register_type_ref(
                RefAttrs::from(attributes.into_iter().collect::<HashMap<_, _>>())
                    .with_target(RefTarget::Direct(type_def)),
            ),
        }
    }

    pub fn direct(target: TypeDef, attributes: Vec<(String, String)>) -> Result<Self> {
        Store::register_type_ref(RefAttrs::from(attributes).with_target(RefTarget::Direct(target)))
    }

    pub fn indirect(name: String, attributes: Vec<(String, String)>) -> Result<Self> {
        Store::register_type_ref(RefAttrs::from(attributes).with_target(RefTarget::Indirect(name)))
    }

    pub fn repr(&self) -> String {
        let attrs = self
            .attributes
            .iter()
            .map(|(k, v)| format!(", [{}] => '{}'", k, v))
            .collect::<Vec<_>>()
            .join("");
        match &self.target {
            RefTarget::Direct(type_def) => {
                format!("ref(#{}{attrs}) to {}", self.id.0, type_def.repr())
            }
            RefTarget::Indirect(name) => {
                format!("ref(#{} , target_name: '{}'{attrs})", self.id.0, name)
            }
        }
    }

    pub fn attrs(&self) -> &RefAttrsInner {
        self.attributes.0.as_ref().unwrap()
    }
}
