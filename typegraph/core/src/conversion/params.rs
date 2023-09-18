// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use common::typegraph::{Auth, AuthProtocol, Cors, Rate};
use indexmap::IndexMap;

impl From<crate::wit::core::Cors> for Cors {
    fn from(value: crate::wit::core::Cors) -> Self {
        Cors {
            allow_origin: value.allow_origin,
            allow_headers: value.allow_headers,
            expose_headers: value.expose_headers,
            allow_methods: value.allow_methods,
            allow_credentials: value.allow_credentials,
            max_age_sec: value.max_age_sec,
        }
    }
}

impl From<crate::wit::core::AuthProtocol> for AuthProtocol {
    fn from(value: crate::wit::core::AuthProtocol) -> Self {
        match value {
            crate::wit::core::AuthProtocol::Oauth2 => AuthProtocol::OAuth2,
            crate::wit::core::AuthProtocol::Jwt => AuthProtocol::Jwt,
            crate::wit::core::AuthProtocol::Basic => AuthProtocol::Basic,
        }
    }
}

impl From<crate::wit::core::Rate> for Rate {
    fn from(value: crate::wit::core::Rate) -> Self {
        Rate {
            window_limit: value.window_limit,
            window_sec: value.window_sec,
            query_limit: value.query_limit,
            context_identifier: value.context_identifier,
            local_excess: value.local_excess,
        }
    }
}

impl crate::wit::core::Auth {
    pub fn convert(&self) -> Result<Auth> {
        let mut auth_data = IndexMap::new();
        for (k, v) in self.auth_data.iter() {
            auth_data.insert(
                k.clone(),
                serde_json::from_str(v).map_err(|e| format!("error at key {:?}: {}", k, e))?,
            );
        }
        Ok(Auth {
            name: self.name.clone(),
            protocol: self.protocol.into(),
            auth_data,
        })
    }
}
