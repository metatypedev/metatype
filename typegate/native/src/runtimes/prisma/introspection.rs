// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

// https://github.com/prisma/prisma-engines/blob/main/introspection-engine/introspection-engine-tests/src/test_api.rs

use introspection_connector::{CompositeTypeDepth, IntrospectionConnector, IntrospectionContext};
use introspection_core::Error;
use prisma_models::psl::{self, Diagnostics, SourceFile};
use sql_introspection_connector::SqlIntrospectionConnector;
use std::result::Result;

pub struct Introspection {}

impl Introspection {
    pub async fn introspect(schema: String) -> Result<String, Error> {
        let customize = |diag: Diagnostics| {
            Error::DatamodelError(diag.to_pretty_string("schema.prisma", &schema))
        };

        let config_res = psl::parse_configuration(&schema).map_err(customize);
        let config = match config_res {
            Ok(config) => config,
            Err(e) => return Result::Err(Error::DatamodelError(e.to_string())),
        };

        let ds = match config.datasources.first() {
            Some(res) => res,
            None => {
                let msg =
                    String::from("no datasources found in the configuration, None encountered");
                return Result::Err(Error::Generic(msg));
            }
        };

        let url_res = ds.load_url(load_env_var).map_err(customize);

        let url = match url_res {
            Ok(url) => url,
            Err(e) => {
                return Result::Err(Error::DatamodelError(e.to_string()));
            }
        };

        let connector = match SqlIntrospectionConnector::new(url.as_str(), Default::default()).await
        {
            introspection_connector::ConnectorResult::Ok(connector) => connector,
            introspection_connector::ConnectorResult::Err(e) => {
                return Result::Err(Error::ConnectorError(e))
            }
        };

        let previous = psl::validate(SourceFile::new_static(""));
        let ctx =
            IntrospectionContext::new_config_only(previous, CompositeTypeDepth::Level(3), None);

        match connector.introspect(&ctx).await {
            Ok(introspection_result) => {
                if introspection_result.data_model.is_empty() {
                    Result::Err(Error::IntrospectionResultEmpty)
                } else {
                    Result::Ok(introspection_result.data_model)
                }
            }
            Err(e) => Result::Err(Error::ConnectorError(e)),
        }
    }
}

fn load_env_var(key: &str) -> Option<String> {
    std::env::var(key).ok()
}
