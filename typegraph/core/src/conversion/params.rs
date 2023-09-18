// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

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
            crate::wit::core::AuthProtocol::Basic => AuthProtocol::OAuth2,
        }
    }
}

impl From<crate::wit::core::Auth> for Auth {
    fn from(value: crate::wit::core::Auth) -> Self {
        let mut auth_data = IndexMap::new();
        for (k, v) in value.auth_data {
            auth_data.insert(k, serde_json::from_str(&v).unwrap());
        }
        Auth {
            name: value.name,
            protocol: value.protocol.into(),
            auth_data,
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
