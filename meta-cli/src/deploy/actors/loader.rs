// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::PathBuf;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;

use actix::prelude::Context;
use actix::prelude::*;
use colored::Colorize;
use common::typegraph::Typegraph;
use tokio::sync::{mpsc, oneshot};

use crate::config::Config;
use crate::deploy::actors::console::warning;
use crate::typegraph::loader::Loader;
use crate::typegraph::postprocess::{self, DenoModules, EmbedPrismaMigrations};
use crate::utils::plural_suffix;

use super::console::{error, info, ConsoleActor};

#[derive(Debug, Clone)]
pub struct PostProcessOptions {
    pub deno: Option<DenoModules>,
    pub prisma: Option<EmbedPrismaMigrations>,
    pub allow_destructive: bool,
}

impl Default for PostProcessOptions {
    fn default() -> Self {
        Self {
            deno: Some(DenoModules::default()),
            prisma: None,
            allow_destructive: false,
        }
    }
}

impl PostProcessOptions {
    pub fn no_deno(mut self) -> Self {
        self.deno = None;
        self
    }

    pub fn deno_codegen(mut self, codegen: bool) -> Self {
        self.deno = Some(DenoModules::default().codegen(codegen));
        self
    }

    pub fn allow_destructive(mut self, allow: bool) -> Self {
        self.allow_destructive = allow;
        self
    }

    pub fn prisma(mut self, prisma: Option<EmbedPrismaMigrations>) -> Self {
        self.prisma = prisma;
        self
    }
}

#[derive(Clone, Copy, Debug)]
pub enum StopBehavior {
    Stop,
    Restart,
}

pub struct LoaderActor {
    config: Arc<Config>,
    postprocess_options: PostProcessOptions,
    console: Addr<ConsoleActor>,
    stopped_tx: Option<oneshot::Sender<StopBehavior>>,
    stop_behavior: StopBehavior,
    typegraph_tx: mpsc::UnboundedSender<Typegraph>,
    counter: Option<Arc<AtomicU32>>,
}

impl LoaderActor {
    pub fn new(
        config: Arc<Config>,
        postprocess_options: PostProcessOptions,
        console: Addr<ConsoleActor>,
        typegraph_tx: mpsc::UnboundedSender<Typegraph>,
    ) -> Self {
        Self {
            config,
            postprocess_options,
            console,
            stopped_tx: None,
            stop_behavior: StopBehavior::Stop,
            typegraph_tx,
            counter: None,
        }
    }

    pub fn auto_stop(self) -> Self {
        Self {
            counter: Some(Arc::new(AtomicU32::new(0))),
            ..self
        }
    }
}

impl LoaderActor {
    fn loader(&self) -> Loader {
        let mut loader = Loader::new(Arc::clone(&self.config));
        if let Some(deno) = &self.postprocess_options.deno {
            loader = loader.with_postprocessor(deno.clone());
        }
        // .skip_deno_modules(true)
        loader = loader
            .with_postprocessor(postprocess::PythonModules::default())
            .with_postprocessor(postprocess::WasmdegeModules::default());

        if let Some(prisma) = &self.postprocess_options.prisma {
            loader = loader.with_postprocessor(
                prisma
                    .clone()
                    .reset_on_drift(self.postprocess_options.allow_destructive),
            );
        }

        loader
    }

    fn load_module(&self, self_addr: Addr<Self>, path: PathBuf) {
        let loader = self.loader();
        let console = self.console.clone();
        let counter = self.counter.clone();
        Arbiter::current().spawn(async move {
            match loader.load_module(&path).await {
                Ok(tgs) => self_addr.do_send(LoadedModule(path, tgs)),
                Err(e) => {
                    error!(console, "loader error: {:?}", e);
                    if counter.is_some() {
                        // auto stop
                        self_addr.do_send(TryStop(StopBehavior::Stop));
                    }
                }
            }
        });
    }
}

pub enum ReloadReason {
    FileChanged,
    FileCreated,
    DependencyChanged(PathBuf),
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct LoadModule(pub PathBuf);

#[derive(Message)]
#[rtype(result = "()")]
pub struct ReloadModule(pub PathBuf, pub ReloadReason);

#[derive(Message)]
#[rtype(result = "()")]
pub struct TryStop(pub StopBehavior);

#[derive(Message)]
#[rtype(result = "()")]
struct SetStoppedTx(oneshot::Sender<StopBehavior>);

#[derive(Message)]
#[rtype(result = "()")]
struct LoadedModule(pub PathBuf, Vec<Typegraph>);

impl Actor for LoaderActor {
    type Context = Context<Self>;

    #[cfg(debug_assertions)]
    fn started(&mut self, _ctx: &mut Self::Context) {
        log::trace!("LoaderActor started");
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        if let Some(tx) = self.stopped_tx.take() {
            if let Err(e) = tx.send(self.stop_behavior) {
                warning!(self.console, "failed to send stop signal: {:?}", e);
            }
        }
        log::trace!("LoaderActor stopped")
    }
}

impl Handler<LoadModule> for LoaderActor {
    type Result = ();

    fn handle(&mut self, msg: LoadModule, ctx: &mut Context<Self>) -> Self::Result {
        info!(self.console, "Loading module {:?}", msg.0);
        self.load_module(ctx.address(), msg.0);
    }
}

impl Handler<ReloadModule> for LoaderActor {
    type Result = ();

    fn handle(&mut self, msg: ReloadModule, ctx: &mut Context<Self>) -> Self::Result {
        let reason = match msg.1 {
            ReloadReason::FileChanged => "file changed".to_string(),
            ReloadReason::FileCreated => "file created".to_string(),
            ReloadReason::DependencyChanged(path) => format!("dependency changed: {:?}", path),
        };
        info!(self.console, "Reloading module {:?}: {reason}", msg.0);

        self.load_module(ctx.address(), msg.0);
    }
}

impl Handler<LoadedModule> for LoaderActor {
    type Result = ();

    fn handle(&mut self, msg: LoadedModule, ctx: &mut Context<Self>) -> Self::Result {
        let LoadedModule(path, tgs) = msg;
        let count = tgs.len();
        info!(
            self.console,
            "Loaded {count} typegraph{s} from {path:?}: {tgs}",
            s = plural_suffix(count),
            tgs = tgs
                .iter()
                .map(|tg| tg.name().unwrap().cyan().to_string())
                .collect::<Vec<_>>()
                .join(", ")
        );
        for tg in tgs.into_iter() {
            if let Err(e) = self.typegraph_tx.send(tg) {
                error!(self.console, "failed to send typegraph: {:?}", e);
                if self.counter.is_some() {
                    // auto stop
                    ctx.stop();
                }
            }
        }
        if let Some(counter) = self.counter.as_ref() {
            let count = counter.fetch_sub(1, Ordering::SeqCst);
            if count == 0 {
                info!(
                    self.console,
                    "All modules have been loaded. Stopping the loader."
                );
                ctx.notify(TryStop(StopBehavior::Stop));
            }
        }
    }
}

impl Handler<TryStop> for LoaderActor {
    type Result = ();

    fn handle(&mut self, msg: TryStop, ctx: &mut Context<Self>) -> Self::Result {
        if let StopBehavior::Restart = msg.0 {
            self.stop_behavior = StopBehavior::Restart;
        }
        ctx.stop();
    }
}

impl Handler<SetStoppedTx> for LoaderActor {
    type Result = ();

    fn handle(&mut self, msg: SetStoppedTx, _ctx: &mut Context<Self>) -> Self::Result {
        self.stopped_tx = Some(msg.0);
    }
}

pub fn stopped(addr: Addr<LoaderActor>) -> oneshot::Receiver<StopBehavior> {
    let (tx, rx) = oneshot::channel();
    addr.do_send(SetStoppedTx(tx));
    rx
}
