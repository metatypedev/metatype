// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use indexmap::IndexMap;

use super::{Edge, EdgeKind, Type, TypeBase, TypeNode, WeakType, Wrap as _};
use crate::conv::interlude::*;
use crate::{interlude::*, TypeNodeExt as _};
use crate::{policies::PolicyRef, Arc, Lazy};
use std::collections::HashMap;

#[derive(Debug)]
pub struct ObjectProperty {
    pub type_: Type,
    pub policies: Vec<PolicyRef>,
    pub injection: Option<()>, // TODO
    pub outjection: Option<()>,
    pub required: bool,
    pub as_id: bool,
}

#[derive(Debug)]
pub struct ObjectType {
    pub base: TypeBase,
    pub(crate) properties: Lazy<HashMap<Arc<str>, ObjectProperty>>,
}

impl ObjectType {
    pub fn properties(&self) -> Result<&HashMap<Arc<str>, ObjectProperty>> {
        self.properties
            .get()
            .ok_or_else(|| eyre!("object properties uninitialized: ty={:?}", self.base.key))
    }

    pub fn non_empty(self: Arc<Self>) -> Result<Option<Arc<Self>>> {
        Ok(if self.as_ref().properties()?.is_empty() {
            None
        } else {
            Some(self)
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

    fn children(&self) -> Result<Vec<Type>> {
        Ok(self
            .properties()?
            .values()
            .map(|p| p.type_.clone())
            .collect())
    }

    fn edges(&self) -> Result<Vec<Edge>> {
        Ok(self
            .properties()?
            .iter()
            .map(|(name, prop)| Edge {
                from: WeakType::Object(Arc::downgrade(self)),
                to: prop.type_.clone(),
                kind: EdgeKind::ObjectProperty(name.clone()),
            })
            .collect())
    }
}

pub(crate) fn convert_object(
    parent: WeakType,
    key: TypeKey,
    rpath: RelativePath,
    base: &tg_schema::TypeNodeBase,
    data: &tg_schema::ObjectTypeData,
) -> Box<dyn TypeConversionResult> {
    let ty = ObjectType {
        base: Conversion::base(key, parent, base),
        properties: Default::default(),
    }
    .into();

    Box::new(ObjectTypeConversionResult {
        ty,
        properties: data.properties.clone(),
        required: data.required.clone(),
        id: data.id.clone(),
        rpath,
    })
}

pub struct ObjectTypeConversionResult {
    ty: Arc<ObjectType>,
    properties: IndexMap<String, u32>, // TODO reference
    required: Vec<String>,
    id: Vec<String>,
    rpath: RelativePath,
}

impl TypeConversionResult for ObjectTypeConversionResult {
    fn get_type(&self) -> Type {
        self.ty.clone().wrap()
    }

    fn finalize(&mut self, conv: &mut Conversion) -> Result<()> {
        let mut properties = HashMap::with_capacity(self.properties.len());

        let mut results = Vec::new();

        let weak = self.ty.clone().wrap().downgrade();

        for (name, &idx) in self.properties.iter() {
            let name: Arc<str> = name.clone().into();
            let res = conv.convert_type(
                weak.clone(),
                idx,
                self.rpath.push(PathSegment::ObjectProp(name.clone()))?,
            )?;
            let required = self.required.iter().any(|r| r == name.as_ref());
            let as_id = self.id.iter().any(|r| r == name.as_ref());
            properties.insert(
                name,
                ObjectProperty {
                    type_: res.get_type(),
                    policies: Default::default(), // TODO
                    injection: None,              // TODO
                    outjection: None,             // TODO
                    required,
                    as_id,
                },
            );
            results.push(res);
        }

        self.ty.properties.set(properties).map_err(|_| {
            eyre!(
                "OnceLock: cannot set object properties more than once; key={:?}",
                self.ty.key()
            )
        })?;

        for res in results.iter_mut() {
            res.finalize(conv)?;
        }

        Ok(())
    }
}
