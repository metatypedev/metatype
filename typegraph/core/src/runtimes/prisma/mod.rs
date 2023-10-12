// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod context;
pub mod errors;
pub mod migration;
pub mod relationship;
pub mod type_generation;
mod type_utils;
mod utils;

use std::cell::RefCell;
use std::fmt::Debug;
use std::rc::Rc;

use common::typegraph::runtimes::prisma as cm;
use common::typegraph::Materializer;
use indexmap::IndexMap;

use crate::conversion::runtimes::MaterializerConverter;
use crate::errors::Result;
use crate::global_store::Store;
use crate::typegraph::TypegraphContext;
use crate::wit::runtimes::{self as wit, RuntimeId};

use self::context::PrismaContext;
use self::relationship::Cardinality;

use super::Runtime;

pub fn get_prisma_context(runtime_id: RuntimeId) -> Rc<RefCell<PrismaContext>> {
    match Store::get_runtime(runtime_id).unwrap() {
        Runtime::Prisma(_, ctx) => ctx,
        _ => unreachable!(),
    }
}

#[derive(Debug)]
pub struct PrismaMaterializer {
    pub table: String,
    pub operation: String,
    pub ordered_keys: Option<Vec<String>>,
}

impl MaterializerConverter for PrismaMaterializer {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        runtime_id: RuntimeId,
        effect: wit::Effect,
    ) -> Result<Materializer> {
        let runtime = c.register_runtime(runtime_id)?;
        let mut data = IndexMap::new();
        data.insert(
            "table".to_string(),
            serde_json::Value::String(self.table.clone()),
        );
        data.insert(
            "operation".to_string(),
            serde_json::Value::String(self.operation.clone()),
        );
        if let Some(ordered_keys) = self.ordered_keys.clone() {
            let value = serde_json::to_value(ordered_keys).map_err(|e| e.to_string())?;
            data.insert("ordered_keys".to_string(), value);
        }
        Ok(Materializer {
            name: "prisma_operation".to_string(),
            runtime,
            effect: effect.into(),
            data,
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
