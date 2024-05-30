// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;

use crate::cli::{Action, ConfigArgs, NodeArgs};
use crate::{
    com::store::ServerStore,
    config::Config,
    deploy::actors::{console::ConsoleActor, loader::*},
};
use actix::Actor;
use actix_web::dev::ServerHandle;
use clap::Parser;
use common::typegraph::Typegraph;
use metagen::*;

#[derive(Parser, Debug, Clone)]
pub struct Gen {
    #[command(flatten)]
    node: NodeArgs,

    /// Target typegate (cf config)
    #[clap(short, long)]
    pub target: Option<String>,

    /// Metagen target to generate
    #[clap(default_value = "main")]
    gen_target: String,

    /// Force load a typegraph file
    #[clap(short, long)]
    file: Option<PathBuf>,
}

#[async_trait]
impl Action for Gen {
    #[tracing::instrument(skip(server_handle))]
    async fn run(&self, args: ConfigArgs, server_handle: Option<ServerHandle>) -> Result<()> {
        let dir = args.dir()?;
        let config = Config::load_or_find(args.config, &dir)?;
        let config = Arc::new(config);

        let Some(mgen_conf) = &config.metagen else {
            bail!(
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

        let files = metagen::generate_target(
            mgen_conf,
            &self.gen_target,
            config.path.as_ref().unwrap().parent().unwrap().into(),
            resolver,
        )
        .await?;
        files
            .0
            .into_iter()
            .map(|(path, file)| async move {
                tokio::fs::create_dir_all(path.parent().unwrap()).await?;
                if file.overwrite || !tokio::fs::try_exists(&path).await? {
                    tokio::fs::write(path, file.contents).await?;
                }
                Ok::<_, tokio::io::Error>(())
            })
            .collect::<Vec<_>>()
            .try_join()
            .await?;

        server_handle.unwrap().stop(true).await;

        Ok(())
    }
}

#[derive(Clone, Debug)]
struct MetagenCtx {
    config: Arc<Config>,
    typegate: Arc<common::node::Node>,
    dir: PathBuf,
}

impl InputResolver for MetagenCtx {
    #[tracing::instrument]
    async fn resolve(&self, order: GeneratorInputOrder) -> Result<GeneratorInputResolved> {
        Ok(match order {
            GeneratorInputOrder::TypegraphFromTypegate { name } => {
                GeneratorInputResolved::TypegraphFromTypegate {
                    raw: self
                        .typegate
                        .typegraph(&name)
                        .await?
                        .with_context(|| format!("no typegraph found under {name:?}"))?,
                }
            }
            GeneratorInputOrder::TypegraphFromPath { path, name } => {
                let config = self.config.clone();
                let dir = self.dir.join(path);
                let raw = load_tg_at(config, dir, name.as_deref()).await?;
                GeneratorInputResolved::TypegraphFromTypegate { raw }
            }
        })
    }
}

#[tracing::instrument]
async fn load_tg_at(
    config: Arc<Config>,
    path: PathBuf,
    name: Option<&str>,
) -> anyhow::Result<Typegraph> {
    ServerStore::with(
        Some(crate::com::store::Command::Serialize),
        Some(config.as_ref().clone()),
    );
    ServerStore::set_artifact_resolution_flag(false);
    // ServerStore::set_prefix(self.prefix.to_owned());

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
            LoaderEvent::Stopped(res) => {
                if let StopBehavior::ExitFailure(err) = res {
                    bail!("LoaderActor exit failure: {err}");
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
            bail!("typegraph {tg_name:?} not found; available typegraphs are: {suggestions}",);
        }
    } else {
        tgs.swap_remove(0)
    };

    Ok(tg)
}
