// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use serde::Serialize;
use serde_json::json;

use crate::wasm::utils::{Auth, AuthProtocol};

fn stringify<S>(value: &S) -> String
where
    S: Serialize + ?Sized,
{
    serde_json::to_string(value).unwrap()
}

fn jwt<S: Serialize>(name: &str, format: &str, algorithm: S) -> Auth {
    let auth_data = vec![
        ("format".to_string(), stringify(format)),
        ("algorithm".to_string(), stringify(&algorithm)),
    ];

    Auth {
        name: name.to_string(),
        protocol: AuthProtocol::Jwt,
        auth_data,
    }
}

pub fn hmac256(name: &str) -> Auth {
    let algorithm = json!({
      "name": "HMAC",
      "hash": { "name": "SHA-256" },
    });

    jwt(name, "raw", algorithm)
}

pub fn basic(users: &[&str]) -> Auth {
    Auth {
        name: "basic".to_string(),
        protocol: AuthProtocol::Basic,
        auth_data: vec![("users".to_string(), stringify(users))],
    }
}
