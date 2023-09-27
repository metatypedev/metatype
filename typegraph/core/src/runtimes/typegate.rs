// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::Materializer;
use indexmap::IndexMap;

use crate::{
    conversion::runtimes::MaterializerConverter, errors::Result, typegraph::TypegraphContext,
    wit::runtimes::Effect,
};

#[derive(Clone, Debug)]
pub enum TypegateOperation {
    ListTypegraphs,
    FindTypegraph,
    AddTypegraph,
    RemoveTypegraph,
    GetSerializedTypegraph,
    Resolver,
    GetType,
    GetSchema,
}

impl MaterializerConverter for TypegateOperation {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        runtime_id: u32,
        effect: Effect,
    ) -> Result<Materializer> {
        let runtime = c.register_runtime(runtime_id)?;

        Ok(Materializer {
            name: match self {
                Self::ListTypegraphs => "typegraphs",
                Self::FindTypegraph => "typegraph",
                Self::AddTypegraph => "addTypegraph",
                Self::RemoveTypegraph => "removeTypegraph",
                Self::GetSerializedTypegraph => "serializedTypegraph",
                Self::Resolver => "resolver",
                Self::GetType => "getType",
                Self::GetSchema => "getSchema",
            }
            .to_string(),
            runtime,
            effect: effect.into(),
            data: IndexMap::new(),
        })
    }
}
