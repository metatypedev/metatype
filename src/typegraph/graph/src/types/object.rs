// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{Edge, EdgeKind, Type, TypeBase, TypeNode, WeakType};
use crate::conv::dedup::{DupKey, DuplicationKeyGenerator};
use crate::conv::key::TypeKeyEx;
use crate::injection::InjectionNode;
use crate::policies::PolicySpec;
use crate::{interlude::*, TypeNodeExt as _};
use indexmap::IndexMap;

#[derive(Debug)]
pub struct ObjectProperty {
    pub ty: Type,
    pub policies: Vec<PolicySpec>,
    pub injection: Option<Arc<InjectionNode>>,
    pub outjection: Option<()>,
    pub required: bool,
    pub as_id: bool,
}

impl ObjectProperty {
    pub fn is_injected(&self) -> bool {
        self.injection
            .as_ref()
            .filter(|inj| !inj.is_empty())
            .is_some()
    }
}

#[derive(Debug)]
pub struct ObjectType {
    pub base: TypeBase,
    pub(crate) properties: Once<IndexMap<Arc<str>, ObjectProperty>>,
}

impl ObjectType {
    pub fn properties(&self) -> &IndexMap<Arc<str>, ObjectProperty> {
        self.properties
            .get()
            .expect("object properties uninitialized")
    }

    pub fn non_empty(self: Arc<Self>) -> Option<Arc<Self>> {
        if self.as_ref().properties().is_empty() {
            None
        } else {
            Some(self)
        }
    }
}

pub struct LinkObject<K: DupKey> {
    pub ty: Arc<ObjectType>,
    pub properties: IndexMap<Arc<str>, LinkObjectProperty<K>>,
}

pub struct LinkObjectProperty<K: DupKey> {
    pub xkey: TypeKeyEx<K>,
    pub policies: Vec<PolicySpec>,
    pub injection: Option<Arc<InjectionNode>>,
    pub outjection: Option<()>,
    pub required: bool,
    pub as_id: bool,
}

impl<K: DupKey> LinkObject<K> {
    pub fn link<G: DuplicationKeyGenerator<Key = K>>(
        self,
        map: &crate::conv::ConversionMap<G>,
    ) -> Result<()> {
        let mut properties = IndexMap::with_capacity(self.properties.len());
        for (name, prop) in self.properties {
            let ty = map.get_ex(prop.xkey).ok_or_else(|| {
                eyre!(
                    "cannot find property type for object; key={:?}, property={}",
                    self.ty.key(),
                    name
                )
            })?;
            properties.insert(
                name,
                ObjectProperty {
                    ty,
                    policies: prop.policies,
                    injection: prop.injection,
                    outjection: prop.outjection,
                    required: prop.required,
                    as_id: prop.as_id,
                },
            );
        }
        self.ty.properties.set(properties).map_err(|_| {
            eyre!(
                "OnceLock: cannot set object properties more than once; key={:?}",
                self.ty.key()
            )
        })
    }
}

impl TypeNode for Arc<ObjectType> {
    fn base(&self) -> &TypeBase {
        &self.base
    }

    fn tag(&self) -> &'static str {
        "object"
    }

    fn children(&self) -> Vec<Type> {
        self.properties().values().map(|p| p.ty.clone()).collect()
    }

    fn edges(&self) -> Vec<Edge> {
        self.properties()
            .iter()
            .map(|(name, prop)| Edge {
                from: WeakType::Object(Arc::downgrade(self)),
                to: prop.ty.clone(),
                kind: EdgeKind::ObjectProperty(name.clone()),
            })
            .collect()
    }
}
