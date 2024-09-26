// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use serde::Serialize;
use serde_json::Value;

// TODO: - replace with commmon::typegraph types?
//       - per effect injections & expose types

#[derive(Debug, Serialize)]
pub struct Injection {
    source: InjectionSource,
    data: InjectionValue,
}

#[derive(Debug, Serialize)]
pub struct InjectionValue {
    #[serde(skip_serializing_if = "Option::is_none")]
    value: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum InjectionSource {
    Dynamic,
    Static,
    Context,
    Parent,
    Secret,
    Random,
}

pub fn serialize_injection<I>(source: InjectionSource, data: Option<I>) -> String
where
    I: Into<Value>,
{
    let injection = Injection {
        source,
        data: InjectionValue {
            value: data.map(|d| d.into().to_string()), // ASK: Why does it need to be stringified?
        },
    };

    serde_json::to_string(&injection).unwrap()
}
