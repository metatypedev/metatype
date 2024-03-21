// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{path::PathBuf, sync::Arc};

use super::{Action, ConfigArgs, NodeArgs};
use crate::{
    com::store::ServerStore,
    config::Config,
    deploy::actors::{console::ConsoleActor, loader::*},
};
use actix::Actor;
use actix_web::dev::ServerHandle;
use anyhow::{bail, Context, Result};
use async_trait::async_trait;
use clap::Parser;
use common::typegraph::Typegraph;
use metagen::*;

#[derive(Parser, Debug)]
pub struct Gen {
    #[command(flatten)]
    node: NodeArgs,

    /// Target typegate (cf config)
    #[clap(short, long)]
    pub target: Option<String>,

    /// Metagen target to generate
    #[clap(default_value = "main")]
    gen_target: String,
}

#[async_trait]
impl Action for Gen {
    async fn run(&self, args: ConfigArgs, server_handle: Option<ServerHandle>) -> Result<()> {
        let dir = args.dir()?;
        let config = Config::load_or_find(args.config, &dir)?;
        let config = Arc::new(dbg!(config));
        let Some(mgen_conf) = &config.metagen else {
            anyhow::bail!(
                "no metagen section defined in config found at {:?}",
                config.path
            );
        };
        let node_config = config.node(&self.node, self.target.as_deref().unwrap_or("dev"));
        let node = node_config
            .build(&dir)
            .await
            .with_context(|| format!("building node from config: {node_config:#?}"))?;

        let resolver = MetagenCtx {
            config: config.clone(),
            dir,
            typegate: Arc::new(node),
        };

        metagen::generate_target(mgen_conf, &self.gen_target, resolver).await?;

        server_handle.unwrap().stop(true).await;

        Ok(())
    }
}

#[derive(Clone)]
struct MetagenCtx {
    config: Arc<Config>,
    typegate: Arc<common::node::Node>,
    dir: PathBuf,
}

impl InputResolver for MetagenCtx {
    async fn resolve(&self, order: GeneratorInputOrder) -> anyhow::Result<GeneratorInputResolved> {
        Ok(match order {
            GeneratorInputOrder::TypegraphFromTypegate { name } => {
                GeneratorInputResolved::TypegraphFromTypegate {
                    raw: self
                        .typegate
                        .typegraph(&name)
                        .await?
                        .with_context(|| format!("no typegraph found under \"{name}\""))?,
                }
            }
            GeneratorInputOrder::TypegraphFromPath { path, name } => {
                let (tx, rx) = tokio::sync::oneshot::channel();
                let config = self.config.clone();
                let dir = self.dir.join(path);
                tokio::task::spawn_blocking(move || {
                    actix::run(async move {
                        let res = load_tg_at(config, dir, name.as_deref()).await;
                        tx.send(res).unwrap();
                    })
                })
                .await??;
                let raw = rx.await??;
                GeneratorInputResolved::TypegraphFromTypegate { raw }
            }
        })
    }
}

async fn load_tg_at(
    config: Arc<Config>,
    path: PathBuf,
    name: Option<&str>,
) -> anyhow::Result<Typegraph> {
    let console = ConsoleActor::new(Arc::clone(&config)).start();

    let (loader_event_tx, loader_event_rx) = tokio::sync::mpsc::unbounded_channel();

    let loader = LoaderActor::new(Arc::clone(&config), console.clone(), loader_event_tx, 1)
        .auto_stop()
        .start();

    let path = Arc::new(path);

    loader.do_send(LoadModule(path.clone()));
    let mut tgs: Vec<Typegraph> = vec![];
    let mut event_rx = loader_event_rx;
    while let Some(event) = event_rx.recv().await {
        match event {
            LoaderEvent::Typegraph(tg_infos) => {
                let responses = ServerStore::get_responses_or_fail(&tg_infos.path)?;
                for (_, tg) in responses.iter() {
                    tgs.push(tg.as_typegraph()?);
                }
            }
            LoaderEvent::Stopped(b) => {
                log::debug!("event: {b:?}");
                if let StopBehavior::ExitFailure(e) = b {
                    bail!(e);
                }
            }
        }
    }
    if tgs.is_empty() {
        bail!("not typegraphs loaded from path at {path:?}")
    }
    let tg = if let Some(tg_name) = name {
        if let Some(idx) = tgs.iter().position(|tg| tg.name().unwrap() == tg_name) {
            tgs.swap_remove(idx)
        } else {
            let suggestions = tgs
                .iter()
                .map(|tg| tg.name().unwrap())
                .collect::<Vec<_>>()
                .join(", ");
            bail!("typegraph \"{tg_name}\" not found; available typegraphs are: {suggestions}",);
        }
    } else {
        tgs.swap_remove(0)
    };

    Ok(tg)
}

#[tokio::test(flavor = "multi_thread")]
async fn metagen_test() -> anyhow::Result<()> {
    let tmp_dir = tokio::task::spawn_blocking(|| tempfile::tempdir())
        .await??
        .into_path();

    let typegraph_path = std::env::current_dir()?.join("../examples/typegraphs/basic.ts");
    let gen_crate_path = tmp_dir.join("gen");

    tokio::fs::write(
        tmp_dir.join("metatype.yaml"),
        format!(
            r#"
typegates:
  dev:
    url: "http://localhost:7890"
    username: admin
    password: password
    env:
      TG_EXAMPLE_POSTGRES: "postgresql://postgres:password@postgres:5432/db"
      TG_EXAMPLE_MONGO: "mongodb://root:password@mongo:27017/db"
      TG_EXAMPLE_ENV_VAR: "example"
  deploy:
    url: "https://cloud.metatype.dev"
    username: admin
    password: password
    env:
      TG_EXAMPLE_ENV_VAR: "example"
      TG_EXAMPLE_POSTGRES: "postgresql://postgres:password@localhost:5432/db"
      TG_EXAMPLE_MONGO: "mongodb://root:password@mongo:27017/db"

metagen:
  targets: 
    main:
      mdk_rust:
        path: {gen_crate_path}
        typegraph_path: {typegraph_path}
"#,
            gen_crate_path = gen_crate_path.to_string_lossy(),
            typegraph_path = typegraph_path.to_string_lossy(),
        ),
    )
    .await?;

    {
        let out = tokio::process::Command::new("cargo")
            .args(
                format!("run -p meta-cli -- -C {} gen", tmp_dir.to_string_lossy())
                    .split(' ')
                    .collect::<Vec<_>>(),
            )
            .kill_on_drop(true)
            .spawn()?
            .wait()
            .await?;
        assert!(out.success(), "error generating crate {:?}", out);
    }
    {
        let out = tokio::process::Command::new("cargo")
            .args("build".split(' ').collect::<Vec<_>>())
            .current_dir(&gen_crate_path)
            .kill_on_drop(true)
            .spawn()?
            .wait()
            .await?;
        assert!(out.success(), "error building crate {:?}", out);
    }
    tokio::fs::remove_dir_all(tmp_dir).await?;
    Ok(())
}
