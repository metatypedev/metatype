// Copyright Metatype under the Elastic License 2.0.

use anyhow::{anyhow, bail, Context, Result};
use common::typegraph::Typegraph;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::convert::AsRef;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

#[derive(Deserialize, Debug)]
struct PrismaRuntimeData {
    connection_string: String,
    datasource: String,
    datamodel: String,
    managed_types: Vec<usize>,
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
    let p = Command::new(META_BIN.as_path())
        .arg("serialize")
        .arg("-f")
        .arg(path.as_ref().to_str().ok_or(anyhow!("invalid path"))?)
        .arg("-1")
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
    datamodel: String,
    engine_id: String,
}

impl TestContext {
    fn new<P: AsRef<Path>>(path: P) -> Result<Self> {
        let tg = load_typegraph(path).context("could not load typegraph")?;
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

        let datamodel = format!("{}{}", runtime.datasource, runtime.datamodel);
        println!("MODEL: {datamodel}");

        let reg = crate::prisma_register_engine(crate::PrismaRegisterEngineInp {
            datamodel: datamodel.clone(),
            typegraph: tg.types[0].name.clone(),
        });

        Ok(Self {
            datamodel,
            engine_id: reg.engine_id,
        })
    }

    fn query(&self, query: &str) -> Result<crate::PrismaQueryOut> {
        Ok(crate::prisma_query(crate::PrismaQueryInp {
            key: self.engine_id.clone(),
            query: gql(query)?,
            datamodel: self.datamodel.clone(),
        }))
    }
}

fn recreate_db_schema(t: &TestContext) -> Result<()> {
    t.query(
        r#"
        mutation a {
            executeRaw(
            query: "DROP SCHEMA IF EXISTS test CASCADE"
            parameters: "[]"
            )
        }
    "#,
    )?;

    Command::new(META_BIN.as_path())
        .arg("prisma")
        .arg("apply")
        .arg("-f")
        .arg("../tests/typegraphs/prisma.py")
        .envs(venv())
        .output()?;
    Ok(())
}

#[test]
fn simple_record() -> Result<()> {
    let t = TestContext::new("../tests/typegraphs/prisma.py")?;
    recreate_db_schema(&t)?;

    let ret = t.query(
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
    )?;

    let res = serde_json::from_str::<serde_json::Value>(&ret.res)?;

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
