// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::{bail, Result};
use common::typegraph::{runtimes::TGRuntime, Typegraph};
use indexmap::IndexMap;
use serde::{de::DeserializeOwned, ser::Serialize};
use serde_json::{from_value, to_value, Value};

pub fn object_from_map<T: DeserializeOwned>(map: IndexMap<String, Value>) -> Result<T> {
    let map = Value::Object(map.into_iter().collect());
    Ok(from_value(map)?)
}

pub fn map_from_object<T: Serialize>(obj: T) -> Result<IndexMap<String, Value>> {
    let val = to_value(obj)?;
    if let Value::Object(map) = val {
        Ok(map.into_iter().collect())
    } else {
        bail!("value is not an object");
    }
}

pub fn find_runtimes(typegraph: &Typegraph, predicate: impl Fn(&TGRuntime) -> bool) -> Vec<usize> {
    typegraph
        .runtimes
        .iter()
        .enumerate()
        .filter(|(_, rt)| predicate(rt))
        .map(|(idx, _)| idx)
        .collect()
}

pub fn get_materializers(typegraph: &Typegraph, rt_idx: u32) -> Vec<usize> {
    typegraph
        .materializers
        .iter()
        .enumerate()
        .filter(|(_, mat)| mat.runtime == rt_idx)
        .map(|(idx, _)| idx)
        .collect()
}
