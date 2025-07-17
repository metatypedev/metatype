// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::PathBuf;

use crate::utils::metagen_utils::RawTgResolver;
use fs::FsContext;
use indexmap::IndexMap;
use serde_json::json;
use tg_schema::{Auth, AuthProtocol};

use self::oauth2::std::{named_provider, Oauth2Builder};
use crate::errors::Result;
use crate::global_store::{get_sdk_version, Store};
use crate::types::type_ref::InjectionTree;
use crate::types::type_ref::OverrideInjections;

use crate::sdk::core::TypeId as CoreTypeId;
use crate::sdk::utils::{
    Auth as SdkAuth, BaseOauth2Params, FdkConfig, FdkOutput, Oauth2Client, QueryDeployParams,
    ReduceEntry,
};
use crate::types::TypeId;
use std::path::Path;

mod archive;
mod artifacts;
pub mod fs;
pub mod metagen_utils;
mod oauth2;
mod pathlib;
pub mod postprocess;

struct Oauth2Params<'a> {
    name: &'a str,
    authorize_url: &'a str,
    access_url: &'a str,
    scopes: &'a str,
    profile_url: Option<&'a str>,
    profiler: Option<TypeId>,
    clients: &'a [Oauth2Client],
}

impl TryFrom<Oauth2Params<'_>> for String {
    type Error = crate::sdk::core::Error;
    fn try_from(value: Oauth2Params) -> Result<Self> {
        let auth_data = json!({
            "authorize_url": serde_json::to_value(value.authorize_url).unwrap(),
            "access_url": serde_json::to_value(value.access_url).unwrap(),
            "scopes": serde_json::to_value(value.scopes).unwrap(),
            "profile_url": serde_json::to_value(value.profile_url).unwrap(),
            "profiler": value
                .profiler
                .map(|p| p.into())
                .unwrap_or(serde_json::Value::Null),
            "clients": serde_json::to_value(value.clients).unwrap(),
        });

        let ret = serde_json::to_string(&Auth {
            name: value.name.to_string(),
            protocol: AuthProtocol::OAuth2,
            auth_data: serde_json::from_value(auth_data).unwrap(),
        })
        .map_err(|e| e.to_string())?;

        Ok(ret)
    }
}

impl crate::sdk::utils::Handler for crate::Lib {
    fn reduceb(fn_type_id: CoreTypeId, entries: Vec<ReduceEntry>) -> Result<CoreTypeId> {
        let injection_tree = InjectionTree::try_from(entries)?;
        Ok(TypeId(fn_type_id)
            .override_injections(injection_tree)?
            .id()
            .into())
    }

    fn add_graphql_endpoint(graphql: String) -> Result<u32> {
        Store::add_graphql_endpoint(graphql)
    }

    fn add_auth(data: SdkAuth) -> Result<u32> {
        Store::add_auth(data)
    }

    fn add_raw_auth(data: String) -> Result<u32> {
        let raw_auth: Auth = serde_json::from_str(&data).map_err(|e| e.to_string())?;
        Store::add_raw_auth(raw_auth)
    }

    fn oauth2(params: BaseOauth2Params) -> Result<String> {
        Oauth2Builder::new(params.scopes, params.clients).build(named_provider(&params.provider)?)
    }

    fn oauth2_without_profiler(params: BaseOauth2Params) -> Result<String> {
        Oauth2Builder::new(params.scopes, params.clients)
            .no_profiler()
            .build(named_provider(&params.provider)?)
    }

    fn oauth2_with_extended_profiler(
        params: BaseOauth2Params,
        extension: String,
    ) -> Result<String> {
        Oauth2Builder::new(params.scopes, params.clients)
            .with_extended_profiler(extension)
            .build(named_provider(&params.provider)?)
    }

    fn oauth2_with_custom_profiler(
        params: BaseOauth2Params,
        profiler: CoreTypeId,
    ) -> Result<String> {
        Oauth2Builder::new(params.scopes, params.clients)
            .with_profiler(profiler.into())
            .build(named_provider(&params.provider)?)
    }

    fn gql_deploy_query(params: QueryDeployParams) -> Result<String> {
        let query = "
            mutation InsertTypegraph($tg: String!, $secrets: String!, $targetVersion: String!) {
                addTypegraph(fromString: $tg, secrets: $secrets, targetVersion: $targetVersion) {
                    name
                    messages { type text }
                    migrations { runtime migrations }
                    failure
                }
            }
        ";

        let mut secrets_map = IndexMap::new();
        if let Some(secrets) = params.secrets {
            for (secret, value) in secrets {
                secrets_map.insert(secret, value);
            }
        }

        let req_body = json!({
            "query": query,
            "variables": json!({
              "tg": params.tg,
              // map => json object => string
              "secrets": serde_json::to_value(secrets_map).unwrap().to_string(),
              "targetVersion" : get_sdk_version(),
            }),
        });

        Ok(req_body.to_string())
    }

    fn gql_remove_query(names: Vec<String>) -> Result<String> {
        let query = "
            mutation($names: [String!]!) {
                removeTypegraphs(names: $names)
            }
        ";
        let req_body = json!({
            "query": query,
            "variables": json!({
                "names":  names,
            }),
        });

        Ok(req_body.to_string())
    }

    fn gql_ping_query() -> Result<String> {
        let query = "query { ping }";
        let req_body = json!({
            "query": query,
            "variables": json!({}),
        });

        Ok(req_body.to_string())
    }

    fn metagen_exec(config: FdkConfig) -> Result<Vec<FdkOutput>> {
        let gen_config: metagen::Config = serde_json::from_str(&config.config_json)
            .map_err(|e| format!("Load metagen config: {}", e))?;

        let tg = serde_json::from_str(&config.tg_json).map_err(|e| e.to_string())?;
        let fs = FsContext::new(PathBuf::from(&config.workspace_path));
        let resolver = RawTgResolver { tg, fs };

        metagen::generate_target_sync(
            &gen_config,
            &config.target_name,
            PathBuf::from(config.workspace_path),
            resolver,
        )
        .map(|map| {
            map.0
                .iter()
                .map(|(k, v)| FdkOutput {
                    path: k.to_string_lossy().to_string(),
                    content: v.contents.clone(),
                    overwrite: v.overwrite,
                })
                .collect::<Vec<_>>()
        })
        .map_err(|e| format!("Generate target: {}", e).into())
    }

    fn metagen_write_files(items: Vec<FdkOutput>, typegraph_dir: String) -> Result<()> {
        let fs_ctx = FsContext::new(typegraph_dir.into());
        for item in items {
            if fs_ctx.exists(Path::new(&item.path))? && !item.overwrite {
                continue;
            }
            fs_ctx.write_text_file(Path::new(&item.path), item.content)?;
        }
        Ok(())
    }
}
