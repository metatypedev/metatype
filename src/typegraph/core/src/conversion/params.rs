// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph as cm;
use indexmap::IndexMap;

use crate::{
    errors::Result,
    types::{
        core::{Cors, Rate},
        utils::{Auth, AuthProtocol},
    },
};

impl From<Cors> for cm::Cors {
    fn from(value: Cors) -> Self {
        Self {
            allow_origin: value.allow_origin,
            allow_headers: value.allow_headers,
            expose_headers: value.expose_headers,
            allow_methods: value.allow_methods,
            allow_credentials: value.allow_credentials,
            max_age_sec: value.max_age_sec,
        }
    }
}

impl From<Rate> for cm::Rate {
    fn from(value: Rate) -> Self {
        Self {
            window_limit: value.window_limit,
            window_sec: value.window_sec,
            query_limit: value.query_limit,
            context_identifier: value.context_identifier,
            local_excess: value.local_excess,
        }
    }
}

impl From<AuthProtocol> for cm::AuthProtocol {
    fn from(value: AuthProtocol) -> Self {
        match value {
            AuthProtocol::Oauth2 => Self::OAuth2,
            AuthProtocol::Jwt => Self::Jwt,
            AuthProtocol::Basic => Self::Basic,
        }
    }
}

impl Auth {
    pub fn convert(&self) -> Result<cm::Auth> {
        let mut auth_data = IndexMap::new();
        for (k, v) in self.auth_data.iter() {
            auth_data.insert(
                k.clone(),
                serde_json::from_str(v).map_err(|e| format!("error at key {:?}: {}", k, e))?,
            );
        }
        Ok(cm::Auth {
            name: self.name.clone(),
            protocol: self.protocol.into(),
            auth_data,
        })
    }
}
