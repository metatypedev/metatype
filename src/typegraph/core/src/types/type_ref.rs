// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{collections::HashMap, rc::Rc};

use crate::errors::{self, Result};
use crate::global_store::Store;
use crate::types::{TypeDef, TypeDefExt as _, TypeId};

use super::Type;

#[derive(Clone, Debug)]
pub enum RefTarget {
    Direct(TypeDef),
    Indirect(String),
}
impl RefTarget {
    fn as_indirect(&self) -> Option<&str> {
        match self {
            RefTarget::Indirect(name) => Some(name),
            _ => None,
        }
    }
}

#[derive(Clone, Debug)]
pub struct TypeRef {
    pub id: TypeId,
    pub target: RefTarget,
    pub attributes: Rc<HashMap<String, String>>,
}

pub struct TypeRefBuilder {
    target: RefTarget,
    attributes: HashMap<String, String>,
}

impl TypeRefBuilder {
    pub fn with_id(self, id: TypeId) -> TypeRef {
        TypeRef {
            id,
            target: self.target,
            attributes: self.attributes.into(),
        }
    }
}

impl TypeRef {
    fn builder(target: RefTarget, attributes: HashMap<String, String>) -> TypeRefBuilder {
        TypeRefBuilder { target, attributes }
    }

    // TODO merge rules?
    fn merge_attributes(
        bottom: Rc<HashMap<String, String>>,
        top: impl Iterator<Item = (String, String)>,
    ) -> HashMap<String, String> {
        let mut bottom = (*bottom).clone();
        for (k, v) in top {
            bottom.insert(k, v);
        }
        bottom
    }

    pub fn new(target: TypeId, attributes: Vec<(String, String)>) -> Result<TypeRef> {
        match target.as_type()? {
            Type::Ref(type_ref) => {
                let attributes =
                    Self::merge_attributes(Rc::clone(&type_ref.attributes), attributes.into_iter());
                let builder = Self::builder(type_ref.target, attributes);
                Store::register_type_ref(builder)
            }
            Type::Def(type_def) => {
                let builder = Self::builder(
                    RefTarget::Direct(type_def),
                    attributes.into_iter().collect(),
                );
                Store::register_type_ref(builder)
            }
        }
    }

    pub fn direct(target: TypeDef, attributes: Vec<(String, String)>) -> Result<Self> {
        let builder = Self::builder(RefTarget::Direct(target), attributes.into_iter().collect());
        Store::register_type_ref(builder)
    }

    pub fn indirect(name: String, attributes: Vec<(String, String)>) -> Result<Self> {
        let builder = Self::builder(RefTarget::Indirect(name), attributes.into_iter().collect());
        Store::register_type_ref(builder)
    }

    pub fn resolve(&self) -> Option<TypeDef> {
        match &self.target {
            RefTarget::Direct(type_def) => Some(type_def.clone()),
            RefTarget::Indirect(name) => Store::get_type_by_name(name),
        }
    }

    pub fn try_resolve(&self) -> Result<TypeDef> {
        self.resolve()
            .ok_or_else(|| errors::unregistered_type_name(self.target.as_indirect().unwrap()))
    }

    pub fn resolve_ref(&self) -> Result<(RefData, TypeDef)> {
        let ref_data = RefData {
            id: self.id,
            attributes: self.attributes.clone(),
        };

        let type_def = self.try_resolve()?;
        Ok((ref_data, type_def))
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
}

#[derive(Debug)]
pub struct RefData {
    pub id: TypeId,
    pub attributes: Rc<HashMap<String, String>>,
}
