// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod errors;
pub mod relationship;
pub mod type_generation;
mod type_utils;

use std::fmt::Debug;

use common::typegraph::runtimes::prisma as cm;
use common::typegraph::Materializer;
use indexmap::IndexMap;

use crate::conversion::runtimes::MaterializerConverter;
use crate::errors::Result;
use crate::global_store::{with_store, Store};
use crate::typegraph::TypegraphContext;
use crate::wit::runtimes::{self as wit, RuntimeId};

use self::relationship::{Cardinality, Relationship, RelationshipModel};
use self::type_generation::TypeGenContext;

use super::Runtime;

pub struct PrismaRuntimeContext(std::cell::RefCell<Option<TypeGenContext>>);

impl Debug for PrismaRuntimeContext {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let inner = self.0.borrow();
        f.debug_tuple("PrismaRuntimeContext").field(&inner).finish()
    }
}

impl Default for PrismaRuntimeContext {
    fn default() -> Self {
        Self(std::cell::RefCell::new(Some(TypeGenContext::default())))
    }
}

pub fn with_prisma_runtime<R>(
    runtime_id: RuntimeId,
    f: impl FnOnce(&mut TypeGenContext) -> Result<R>,
) -> Result<R> {
    let mut ctx = with_store(|s| -> Result<_> {
        match s.get_runtime(runtime_id)? {
            Runtime::Prisma(_, ctx) => Ok(ctx
                .0
                .borrow_mut()
                .take()
                .ok_or_else(|| "prisma runtime context already borrowed".to_string())?),
            _ => Err("not a prisma runtime".to_string()),
        }
    })?;

    let res = f(&mut ctx)?;

    with_store(move |s| match s.get_runtime(runtime_id).unwrap() {
        Runtime::Prisma(_, c) => c.0.borrow_mut().replace(ctx),
        _ => unreachable!(),
    });

    Ok(res)
}

#[derive(Debug)]
pub struct PrismaMaterializer {
    pub table: String,
    pub operation: String,
}

impl MaterializerConverter for PrismaMaterializer {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        s: &Store,
        runtime_id: RuntimeId,
        effect: wit::Effect,
    ) -> Result<Materializer> {
        let runtime = c.register_runtime(s, runtime_id)?;
        let mut data = IndexMap::new();
        data.insert(
            "table".to_string(),
            serde_json::Value::String(self.table.clone()),
        );
        data.insert(
            "operation".to_string(),
            serde_json::Value::String(self.operation.clone()),
        );
        Ok(Materializer {
            name: "prisma_operation".to_string(),
            runtime,
            effect: effect.into(),
            data,
        })
    }
}

pub struct ConversionContext<'a> {
    pub runtime_id: u32,
    pub store: &'a Store,
    pub tg_context: &'a mut TypegraphContext,
}

impl<'a> ConversionContext<'a> {
    pub fn convert_relationship(&mut self, rel: Relationship) -> Result<cm::Relationship> {
        let Relationship { name, left, right } = rel;
        let left = self.convert_relationship_model(left)?;
        let right = self.convert_relationship_model(right)?;
        Ok(cm::Relationship { name, left, right })
    }

    pub fn convert_relationship_model(
        &mut self,
        model: RelationshipModel,
    ) -> Result<cm::RelationshipModel> {
        Ok(cm::RelationshipModel {
            type_idx: self
                .tg_context
                .register_type(model.model_type, Some(self.runtime_id))?
                .into(),
            field: model.field,
            cardinality: model.cardinality.into(),
        })
    }
}

impl From<Cardinality> for cm::Cardinality {
    fn from(cardinality: Cardinality) -> Self {
        match cardinality {
            Cardinality::Optional => cm::Cardinality::Optional,
            Cardinality::One => cm::Cardinality::One,
            Cardinality::Many => cm::Cardinality::Many,
        }
    }
}
