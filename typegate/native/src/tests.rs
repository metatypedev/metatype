// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::prisma::migration;
use anyhow::{anyhow, bail, Context, Result};
use common::typegraph::Typegraph;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::any::type_name;
use std::collections::HashMap;
use std::convert::AsRef;
use std::env;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use url::Url;

#[derive(Deserialize, Debug)]
struct PrismaRuntimeData {
    connection_string_secret: String,
    datamodel: String,
}

fn get_workspace_root() -> Result<PathBuf> {
    let p = Command::new("cargo")
        .arg("metadata")
        .arg("--no-deps")
        .arg("--format-version")
        .arg("1")
        .stdout(Stdio::piped())
        .spawn()
        .context("read cargo metadata")?;
    let output = p
        .wait_with_output()
        .context("failed to get cargo metadata")?;

    use serde_json::Value;
    let metadata: Value = serde_json::from_str(std::str::from_utf8(&output.stdout)?)?;
    if let Value::Object(obj) = metadata {
        let workspace_root = obj.get("workspace_root").unwrap();
        if let Value::String(workspace_root) = workspace_root {
            return Ok(PathBuf::from(workspace_root));
        }
    }

    bail!("could not read workspace root from cargo metadata")
}

lazy_static! {
    static ref META_BIN: PathBuf = get_workspace_root().unwrap().join("target/debug/meta");
}

fn venv() -> HashMap<String, String> {
    let mut envs = HashMap::new();
    envs.insert(
        "VIRTUAL_ENV".to_string(),
        get_workspace_root()
            .unwrap()
            .join("typegraph/.venv")
            .as_path()
            .to_str()
            .unwrap()
            .to_string(),
    );
    envs.insert(
        "PATH".to_string(),
        format!(
            "{}:{}",
            get_workspace_root()
                .unwrap()
                .join("typegraph/.venv/bin")
                .as_path()
                .to_str()
                .unwrap()
                .to_string(),
            std::env::vars()
                .find(|(k, _v)| k.as_str() == "PATH")
                .unwrap()
                .1
        ),
    );
    envs
}

// TODO: cache
fn load_typegraph<P: AsRef<Path>>(path: P) -> Result<Typegraph> {
    let parent = path.as_ref().parent().unwrap();
    let file = path.as_ref().file_name().unwrap().to_str().unwrap();
    let p = Command::new(META_BIN.as_path())
        .arg("serialize")
        .arg("-f")
        .arg(file)
        .arg("-1")
        .current_dir(parent)
        .envs(venv())
        .stdout(Stdio::piped())
        .spawn()?;

    let output = p.wait_with_output()?;
    let json = String::from_utf8(output.stdout)?;
    Ok(serde_json::from_str(&json)?)
}

#[derive(Serialize)]
struct GraphQlQuery {
    query: String,
    variables: HashMap<String, serde_json::Value>,
}

fn gql(query: &str) -> Result<serde_json::Value> {
    Ok(serde_json::to_value(GraphQlQuery {
        query: query.to_string(),
        variables: HashMap::default(),
    })?)
}

struct TestContext {
    datasource: String,
    datamodel: String,
    engine_id: String,
}

fn make_datasource(uri: String) -> Result<String> {
    let url = Url::parse(&uri)?;
    let datasource = format!(
        r#"
        datasource db {{
            provider = "{}"
            url      = "{}"
        }}
        "#,
        url.scheme(),
        uri
    );
    Ok(datasource)
}

fn env_fetch(typegraph_name: String, var: String) -> String {
    let name = format!("TG_{}_{}", typegraph_name, var).to_uppercase();
    env::var(name.clone()).expect(&format!("Cannot find env var {}", name))
}

impl TestContext {
    async fn new<P: AsRef<Path>>(path: P) -> Result<Self> {
        let tg = load_typegraph(path).context("could not load typegraph")?;
        let tg_name = tg.name()?;
        let runtime = tg
            .runtimes
            .into_iter()
            .filter(|r| &r.name == "prisma")
            .map(|r| {
                serde_json::from_value::<PrismaRuntimeData>(serde_json::Value::Object(
                    r.data.into_iter().collect::<serde_json::Map<_, _>>(),
                ))
            })
            .collect::<Result<Vec<_>, serde_json::Error>>()?
            .into_iter()
            .next()
            .ok_or(anyhow!("no prisma runtime"))?;

        let secret = env_fetch(tg_name, runtime.connection_string_secret);
        let datasource = make_datasource(secret)?;
        let engine_id = crate::prisma::register_engine(
            format!("{}{}", datasource, runtime.datamodel),
            tg.types[0].base().title.clone(),
        )
        .await?;

        Ok(Self {
            datasource,
            datamodel: runtime.datamodel,
            engine_id: engine_id,
        })
    }

    async fn query(&self, query: &str) -> Result<String> {
        crate::prisma::query(self.engine_id.clone(), gql(query)?).await
    }

    async fn migrate(&self) -> Result<()> {
        let _res = migration::push(self.datasource.clone(), self.datamodel.clone()).await?;
        Ok(())
    }
}

async fn recreate_db_schema(t: &TestContext) -> Result<()> {
    t.query(
        r#"
        mutation a {
            execute_raw(
            query: "DROP SCHEMA IF EXISTS test CASCADE"
            parameters: "[]"
            )
        }
    "#,
    )
    .await?;

    t.migrate().await?;

    Ok(())
}

#[tokio::test]
async fn simple_record() -> Result<()> {
    dotenv::from_path("../.env.ci")?;

    let t = TestContext::new("../tests/prisma/prisma.py").await?;
    recreate_db_schema(&t).await?;

    let ret = t
        .query(
            r#"
            mutation {
                createOneusers(
                    data: {
                        id: 12
                        name: "User"
                        email: "user@example.com"
                    }
                ) {
                    id
                }
            }
        "#,
        )
        .await?;

    let res = serde_json::from_str::<serde_json::Value>(&ret)?;

    use serde_json::Value::*;
    match res {
        Object(ref res) => match res.get("errors") {
            Some(errors) => match errors {
                Array(errors) => bail!(
                    "Errors:\n -- {}",
                    errors
                        .iter()
                        .map(|e| serde_json::to_string_pretty(e))
                        .collect::<Result<Vec<_>, serde_json::Error>>()?
                        .join("\n -- ")
                ),
                _ => panic!("Error: {errors:?}"),
            },
            _ => Ok(()),
        },
        _ => panic!("Invalid result"),
    }
}
