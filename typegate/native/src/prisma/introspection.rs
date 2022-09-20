// Copyright Metatype under the Elastic License 2.0.

// https://github.com/prisma/prisma-engines/blob/main/introspection-engine/introspection-engine-tests/src/test_api.rs

use introspection_connector::{CompositeTypeDepth, IntrospectionConnector, IntrospectionContext};
use introspection_core::Error;
use prisma_models::{dml::Datamodel, psl};
use sql_introspection_connector::SqlIntrospectionConnector;
use std::result::Result;

pub struct Introspection {}

impl Introspection {
    pub async fn introspect(schema: String) -> Result<String, Error> {
        let config = match datamodel::parse_configuration(&schema).map_err(|diagnostics| {
            Error::DatamodelError(diagnostics.to_pretty_string("schema.prisma", &schema))
        }) {
            Ok(config) => config,
            Err(e) => return Result::Err(Error::DatamodelError(e.to_string())),
        };

        let config2 = match datamodel::parse_configuration(&schema).map_err(|diagnostics| {
            Error::DatamodelError(diagnostics.to_pretty_string("schema.prisma", &schema))
        }) {
            Ok(config) => config,
            Err(e) => return Result::Err(Error::DatamodelError(e.to_string())),
        };

        let ds = config.datasources.first().unwrap();

        let url = ds.load_url(load_env_var).unwrap();

        let connector = match SqlIntrospectionConnector::new(url.as_str(), Default::default()).await
        {
            introspection_connector::ConnectorResult::Ok(connector) => connector,
            introspection_connector::ConnectorResult::Err(e) => {
                return Result::Err(Error::ConnectorError(e))
            }
        };

        let ctx = IntrospectionContext {
            preview_features: Default::default(),
            source: config.datasources.into_iter().next().unwrap(),
            composite_type_depth: CompositeTypeDepth::Level(3),
        };

        let datamodel = Datamodel::new();

        match connector.introspect(&datamodel, ctx).await {
            Ok(introspection_result) => {
                if introspection_result.data_model.is_empty() {
                    Result::Err(Error::IntrospectionResultEmpty)
                } else {
                    Result::Ok(psl::render_datamodel_to_string(
                        &introspection_result.data_model,
                        Some(&config2),
                    ))
                }
            }
            Err(e) => Result::Err(Error::ConnectorError(e)),
        }
    }
}

fn load_env_var(key: &str) -> Option<String> {
    std::env::var(key).ok()
}
