// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use anyhow::{Context, Result};
use indoc::indoc;
use reqwest::{Client, IntoUrl, RequestBuilder, Url};
use serde::Serialize;
use std::{collections::HashMap, time::Duration};

use crate::{
    graphql::{self, Query},
    typegraph::Typegraph,
};

#[derive(Debug, Serialize, Clone)]
pub struct BasicAuth {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Node {
    pub base_url: Url,
    pub prefix: Option<String>,
    pub auth: Option<BasicAuth>,
}

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Graphql(#[from] graphql::Error),
    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

impl Node {
    pub fn new<U: IntoUrl>(
        url: U,
        prefix: Option<String>,
        auth: Option<BasicAuth>,
    ) -> Result<Self> {
        Ok(Self {
            base_url: url.into_url().context("error parsing url")?,
            prefix,
            auth,
        })
    }

    pub fn post(&self, path: &str) -> Result<RequestBuilder> {
        let mut b = Client::new().post(self.base_url.join(path)?);
        if let Some(auth) = &self.auth {
            b = b.basic_auth(&auth.username, Some(&auth.password));
        }
        Ok(b.timeout(Duration::from_secs(5)))
    }

    fn graphql_vars(
        tg: &Typegraph,
        secrets: &HashMap<String, String>,
        target_version: String,
    ) -> Result<serde_json::Value> {
        Ok(serde_json::json!({
            "tg": serde_json::to_string(&tg)?,
            "secrets": serde_json::to_string(secrets)?,
            "targetVersion": target_version,
        }))
    }

    pub async fn try_deploy(
        &self,
        tg: &Typegraph,
        secrets: &HashMap<String, String>,
        cli_version: String,
    ) -> Result<graphql::Response, Error> {
        self.post("/typegate")
            .map_err(Error::Other)?
            .timeout(Duration::from_secs(10))
            .gql(
                indoc! {"
                mutation InsertTypegraph($tg: String!, $secrets: String!, $cliVersion: String!) {
                    addTypegraph(fromString: $tg, secrets: $secrets, cliVersion: $cliVersion) {
                        name
                        messages { type text }
                        migrations { runtime migrations }
                        failure
                    }
                }"}
                .to_string(),
                Some(Self::graphql_vars(tg, secrets, cli_version).map_err(Error::Other)?),
            )
            .await
            .map_err(Error::Graphql)
    }

    pub async fn try_undeploy(&self, typegraphs: &[String]) -> Result<()> {
        let res = self
            .post("/typegate")?
            .gql(
                indoc! {"
                mutation($names: [String!]!) {
                    removeTypegraphs(names: $names)
                }"}
                .to_string(),
                Some(serde_json::json!({
                    "names": typegraphs,
                })),
            )
            .await?;

        let res: bool = res
            .data("removeTypegraphs")
            .context("removeTypegraph reponse")?;
        if !res {
            anyhow::bail!("undeploy failed");
        }
        Ok(())
    }

    pub async fn typegraph(&self, name: &str) -> Result<Option<Box<Typegraph>>, Error> {
        let res = self
            .post("/typegate")
            .map_err(Error::Other)?
            .timeout(Duration::from_secs(10))
            .gql(
                indoc! {"
                query getTypegraph($name: String!){
                    typegraph(name: $name){
                        serialized
                    }
                }
                "}
                .to_string(),
                Some(serde_json::json!({
                    "name": name
                })),
            )
            .await
            .map_err(Error::Graphql)?;
        #[derive(serde::Deserialize)]
        struct Res {
            serialized: String,
        }
        let Ok(res) = res.data::<Res>("typegraph") else {
            return Ok(None);
        };
        serde_json::from_str::<Typegraph>(&res.serialized)
            .map(|tg| Some(Box::new(tg)))
            .map_err(|err| Error::Other(anyhow::anyhow!(err)))
    }
}
