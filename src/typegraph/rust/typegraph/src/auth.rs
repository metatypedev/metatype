// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use serde::Serialize;
use serde_json::json;

use crate::{
    utils::json_stringify,
    wasm::{
        self,
        utils::{Auth, AuthProtocol},
    },
    Result,
};

pub trait AddAuth {
    fn add(self) -> Result<u32>;
}

#[derive(Debug)]
pub struct OAuth2 {
    pub provider: String,
    pub scopes: String,
    pub profiler: OAuth2Profiler,
}

impl OAuth2 {
    pub fn new(provider: &str, scopes: &str, profiler: OAuth2Profiler) -> Self {
        Self {
            provider: provider.to_string(),
            scopes: scopes.to_string(),
            profiler,
        }
    }
}

impl AddAuth for OAuth2 {
    fn add(self) -> Result<u32> {
        let provider = &self.provider;
        let scopes = &self.scopes;

        let auth = wasm::with_utils(|u, s| match self.profiler {
            OAuth2Profiler::Default => u.call_oauth2(s, provider, scopes),
            OAuth2Profiler::None => u.call_oauth2_without_profiler(s, provider, scopes),
            OAuth2Profiler::Custom(id) => {
                u.call_oauth2_with_custom_profiler(s, provider, scopes, id)
            }
            OAuth2Profiler::Extended(extension) => {
                u.call_oauth2_with_extended_profiler(s, provider, scopes, &extension)
            }
        })?;

        wasm::with_utils(|u, s| u.call_add_raw_auth(s, &auth))
    }
}

impl AddAuth for Auth {
    fn add(self) -> Result<u32> {
        wasm::with_utils(|u, s| u.call_add_auth(s, &self))
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum OAuth2Profiler {
    Default,
    None,
    Extended(String),
    Custom(u32),
}

pub fn basic(users: impl IntoIterator<Item = impl ToString>) -> Auth {
    let users = users
        .into_iter()
        .map(|user| user.to_string())
        .collect::<Vec<_>>();

    Auth {
        name: "basic".to_string(),
        protocol: AuthProtocol::Basic,
        auth_data: vec![("users".to_string(), json_stringify(&users))],
    }
}

pub fn hmac256(name: &str) -> Auth {
    let algorithm = json!({
      "name": "HMAC",
      "hash": { "name": "SHA-256" },
    });

    jwt(name, "raw", algorithm)
}

pub mod oauth2 {
    use super::{OAuth2, OAuth2Profiler};

    macro_rules! oath2_fn {
        ($provider: ident) => {
            pub fn $provider(scopes: &str, profiler: OAuth2Profiler) -> OAuth2 {
                OAuth2::new(stringify!($provider), scopes, profiler)
            }
        };
    }

    oath2_fn!(digitalocean);
    oath2_fn!(discord);
    oath2_fn!(dropbox);
    oath2_fn!(facebook);
    oath2_fn!(github);
    oath2_fn!(gitlab);
    oath2_fn!(google);
    oath2_fn!(instagram);
    oath2_fn!(linkedin);
    oath2_fn!(microsoft);
    oath2_fn!(reddit);
    oath2_fn!(slack);
    oath2_fn!(stackexchange);
    oath2_fn!(twitter);
}

fn jwt<S: Serialize>(name: &str, format: &str, algorithm: S) -> Auth {
    let auth_data = vec![
        ("format".to_string(), json_stringify(format)),
        ("algorithm".to_string(), json_stringify(&algorithm)),
    ];

    Auth {
        name: name.to_string(),
        protocol: AuthProtocol::Jwt,
        auth_data,
    }
}
