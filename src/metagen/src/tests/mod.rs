// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::borrow::Cow;

use crate::{interlude::*, *};

mod fixtures;
pub use fixtures::*;
use futures_concurrency::future::FutureGroup;
use futures_lite::StreamExt as _;

#[derive(Clone)]
struct TestCtx {
    typegraphs: Arc<IndexMap<String, Box<Typegraph>>>,
}

impl InputResolver for TestCtx {
    async fn resolve(&self, order: GeneratorInputOrder) -> anyhow::Result<GeneratorInputResolved> {
        match order {
            GeneratorInputOrder::TypegraphFromTypegate { name } => {
                Ok(GeneratorInputResolved::TypegraphFromTypegate {
                    raw: self.typegraphs.get(&name).unwrap().clone(),
                })
            }
            GeneratorInputOrder::TypegraphFromPath { .. } => unimplemented!(),
            GeneratorInputOrder::LoadFdkTemplate {
                default,
                override_path,
            } => Ok(GeneratorInputResolved::FdkTemplate {
                template: load_fdk_template(default, override_path.as_deref()).await?,
            }),
        }
    }
}

async fn load_fdk_template(
    default: &[(&'static str, &'static str)],
    template_dir: Option<&std::path::Path>,
) -> anyhow::Result<FdkTemplate> {
    let mut group = FutureGroup::new();
    for (file_name, content) in default.iter() {
        // TODO absolute path?
        let override_path: Option<PathBuf> = template_dir.map(Into::into);
        group.insert(Box::pin(async move {
            let content = if let Some(override_path) = override_path {
                let path = override_path.join(file_name);
                if tokio::fs::try_exists(&path).await? {
                    Cow::Owned(tokio::fs::read_to_string(path).await?)
                } else {
                    Cow::Borrowed(*content)
                }
            } else {
                Cow::Borrowed(*content)
            };
            anyhow::Ok((*file_name, content))
        }));
    }

    let mut entries = IndexMap::new();
    while let Some(res) = group.next().await {
        let (file_name, content) = res?;
        entries.insert(file_name, content);
    }
    Ok(FdkTemplate { entries })
}

#[derive(Debug)]
pub struct BuildArgs {
    pub path: PathBuf,
}

type BoxFuture<T> = std::pin::Pin<Box<dyn std::future::Future<Output = T> + Send + Sync + 'static>>;

pub struct E2eTestCase {
    pub target: String,
    pub config: config::Config,
    pub target_dir: Option<PathBuf>,
    pub typegraphs: IndexMap<String, Box<Typegraph>>,
    pub build_fn: fn(BuildArgs) -> BoxFuture<anyhow::Result<()>>,
}

pub async fn e2e_test(cases: Vec<E2eTestCase>) -> anyhow::Result<()> {
    // spin_up_typegate
    for case in cases {
        let tmp_dir = tokio::task::spawn_blocking(tempfile::tempdir)
            .await??
            .into_path();
        if let Some(target_dir) = &case.target_dir {
            let mut dir = tokio::fs::read_dir(target_dir).await?;
            while let Some(entry) = dir.next_entry().await? {
                let entry_path = entry.path();
                let target_path = tmp_dir.join(entry.path().strip_prefix(target_dir)?);
                tokio::fs::copy(entry_path, &target_path)
                    .await
                    .context("error copying target_dir to temp dir")?;
            }
        }

        // generate
        let typegraphs = Arc::new(case.typegraphs);
        let test_cx = TestCtx {
            typegraphs: typegraphs.clone(),
        };
        unsafe {
            std::env::set_var("METAGEN_CLIENT_RS_TEST", "1");
            std::env::set_var("METAGEN_BIN_PATH", "main.rs");
        }
        let files =
            crate::generate_target(&case.config, &case.target, tmp_dir.clone(), test_cx).await?;
        for (path, buf) in files.0 {
            let path = tmp_dir.join(path);
            tokio::fs::create_dir_all(path.parent().unwrap()).await?;
            if buf.overwrite || !tokio::fs::try_exists(&path).await? {
                tokio::fs::write(path, buf.contents).await?;
            }
        }
        unsafe {
            std::env::remove_var("METAGEN_CLIENT_RS_TEST");
            std::env::remove_var("METAGEN_BIN_PATH");
        }
        // compile
        (case.build_fn)(BuildArgs {
            path: tmp_dir.to_owned(),
        })
        .await?;
        // TODO: upload typegraph along with compiled wasm
        /* for (_name, tg) in typegraphs.iter() {
            node.try_deploy(tg, &Default::default(), env!("CARGO_PKG_VERSION").into())
                .await?;
        } */
        // TODO: query generated stub functions

        // cleanup
        tokio::fs::remove_dir_all(tmp_dir).await?;
        // node.try_undeploy(&typegraphs.keys().cloned().collect::<Vec<_>>()).await?;
    }
    Ok(())
}

#[allow(unused)]
async fn spin_up_typegate() -> anyhow::Result<(tokio::process::Child, common::node::Node)> {
    let tg_port = 7899;

    let tg_secret =
        "a4lNi0PbEItlFZbus1oeH/+wyIxi9uH6TpL8AIqIaMBNvp7SESmuUBbfUwC0prxhGhZqHw8vMDYZAGMhSZ4fLw==";
    let tg_admin_password = "password";

    let typegate = tokio::process::Command::new("cargo")
        .args(["r", "-p", "typegate"])
        .envs([
            ("LOG_LEVEL".to_string(), "DEBUG".to_string()),
            ("TG_PORT".to_string(), tg_port.to_string()),
            ("TG_SECRET".to_string(), tg_secret.to_string()),
            (
                "TG_ADMIN_PASSWORD".to_string(),
                tg_admin_password.to_string(),
            ),
        ])
        .kill_on_drop(true)
        .spawn()?;
    let node = common::node::Node::new(
        format!("localhost:{tg_port}"),
        None,
        Some(common::node::BasicAuth {
            username: "admin".into(),
            password: tg_admin_password.into(),
        }),
    )
    .map_err(|err| format_err!(Box::new(err)))?;
    Ok((typegate, node))
}
