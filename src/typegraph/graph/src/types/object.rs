// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{Edge, EdgeKind, Type, TypeBase, TypeNode, WeakType, Wrap as _};
use crate::conv::dedup::DuplicationKeyGenerator;
use crate::conv::interlude::*;
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

pub(crate) fn convert_object<G: DuplicationKeyGenerator>(
    base: crate::TypeBase,
    data: &tg_schema::ObjectTypeData,
    rpath: RelativePath,
) -> Box<dyn TypeConversionResult<G>> {
    let ty = ObjectType {
        base,
        properties: Default::default(),
    }
    .into();

    Box::new(ObjectTypeConversionResult {
        ty,
        properties: data.properties.clone(),
        required: data.required.clone(),
        id: data.id.clone(),
        rpath,
        policies: data.policies.clone(),
    })
}

pub struct ObjectTypeConversionResult {
    ty: Arc<ObjectType>,
    properties: IndexMap<String, u32>,
    required: Vec<String>,
    id: Vec<String>,
    rpath: RelativePath,
    policies: IndexMap<String, Vec<tg_schema::PolicyIndices>>,
}

impl<G: DuplicationKeyGenerator> TypeConversionResult<G> for ObjectTypeConversionResult {
    fn get_type(&self) -> Type {
        self.ty.clone().wrap()
    }

    fn finalize(&mut self, conv: &mut Conversion<G>) -> Result<()> {
        let mut properties = IndexMap::with_capacity(self.properties.len());

        let weak = self.ty.clone().wrap().downgrade();

        let injections = &self.ty.base.injection;

        for (name, &idx) in self.properties.iter() {
            let name: Arc<str> = name.clone().into();
            let mut res = conv.convert_type(
                weak.clone(),
                idx,
                self.rpath.push(PathSegment::ObjectProp(name.clone()))?,
            )?;
            res.finalize(conv)?;
            let required = self.required.iter().any(|r| r == name.as_ref());
            let as_id = self.id.iter().any(|r| r == name.as_ref());

            let injection = injections.as_ref().and_then(|inj| match inj.as_ref() {
                InjectionNode::Parent { children } => children.get(name.as_ref()).cloned(),
                _ => None,
            });

            let policies = self
                .policies
                .get(name.as_ref())
                .map(|pp| conv.convert_policies(pp))
                .unwrap_or_default();

            properties.insert(
                name,
                ObjectProperty {
                    ty: res.get_type(),
                    policies,
                    injection,
                    outjection: None, // TODO
                    required,
                    as_id,
                },
            );
        }

        self.ty.properties.set(properties).map_err(|_| {
            eyre!(
                "OnceLock: cannot set object properties more than once; key={:?}",
                self.ty.key()
            )
        })?;

        Ok(())
    }
}
