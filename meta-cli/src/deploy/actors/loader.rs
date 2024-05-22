// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
use crate::interlude::*;

use std::sync::atomic::{AtomicU32, Ordering};

use actix::prelude::Context;
use actix::prelude::*;
use tokio::sync::{mpsc, oneshot};

use crate::config::Config;
use crate::typegraph::loader::{LoaderPool, TypegraphInfos};
use crate::typegraph::postprocess::DenoModules;

use super::console::{Console, ConsoleActor};

#[derive(Debug, Clone)]
pub struct PostProcessOptions {
    pub deno: Option<DenoModules>,
}

impl Default for PostProcessOptions {
    fn default() -> Self {
        Self {
            deno: Some(DenoModules::default()),
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
}

#[derive(Clone, Debug)]
pub enum StopBehavior {
    ExitSuccess,
    ExitFailure(String),
    Restart,
}

#[derive(Clone, Debug)]
pub enum LoaderEvent {
    Typegraph(Box<TypegraphInfos>),
    Stopped(StopBehavior),
}

pub struct LoaderActor {
    // config: Arc<Config>,
    console: Addr<ConsoleActor>,
    stopped_tx: Option<oneshot::Sender<StopBehavior>>,
    stop_behavior: StopBehavior,
    event_tx: mpsc::UnboundedSender<LoaderEvent>,
    counter: Option<Arc<AtomicU32>>,
    loader_pool: Arc<LoaderPool>,
}

impl LoaderActor {
    pub fn new(
        config: Arc<Config>,
        console: Addr<ConsoleActor>,
        event_tx: mpsc::UnboundedSender<LoaderEvent>,
        max_parallel_loads: usize,
    ) -> Self {
        let loader_pool = Self::loader_pool(config.clone(), max_parallel_loads);
        Self {
            // config,
            console,
            stopped_tx: None,
            stop_behavior: StopBehavior::ExitSuccess,
            event_tx,
            counter: None,
            loader_pool: Arc::new(loader_pool),
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
    fn loader_pool(config: Arc<Config>, max_parallel_loads: usize) -> LoaderPool {
        LoaderPool::new(config.base_dir.clone(), max_parallel_loads)
    }

    #[tracing::instrument(skip(self))]
    fn load_module(&self, self_addr: Addr<Self>, path: Arc<PathBuf>) {
        let loader_pool = self.loader_pool.clone();
        let console = self.console.clone();
        let counter = self.counter.clone();
        let fut = async move {
            // TODO error handling?
            let loader = loader_pool.get_loader().await.unwrap_or_log();
            match loader.load_module(path.clone()).await {
                Ok(tgs_infos) => {
                    self_addr.do_send(LoadedModule(path.as_ref().to_owned().into(), tgs_infos))
                }
                Err(err) => {
                    if counter.is_some() {
                        // auto stop
                        self_addr.do_send(TryStop(StopBehavior::ExitFailure(err.to_string())));
                    } else {
                        console.error(format!("Loader error: {err:#}"));
                    }
                }
            }
        };
        Arbiter::current().spawn(fut.in_current_span());
    }
}

pub enum ReloadReason {
    FileChanged,
    FileCreated,
    DependencyChanged(PathBuf),
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct LoadModule(pub Arc<PathBuf>);

#[derive(Message)]
#[rtype(result = "()")]
pub struct ReloadModule(pub Arc<PathBuf>, pub ReloadReason);

#[derive(Message)]
#[rtype(result = "()")]
pub struct TryStop(pub StopBehavior);

#[derive(Message)]
#[rtype(result = "()")]
struct SetStoppedTx(oneshot::Sender<StopBehavior>);

#[derive(Message)]
#[rtype(result = "()")]
struct LoadedModule(pub Arc<PathBuf>, TypegraphInfos);

impl Actor for LoaderActor {
    type Context = Context<Self>;

    #[cfg(debug_assertions)]
    fn started(&mut self, _ctx: &mut Self::Context) {
        log::trace!("LoaderActor started");
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        if let Some(tx) = self.stopped_tx.take() {
            if let Err(err) = tx.send(self.stop_behavior.clone()) {
                self.console
                    .warning(format!("failed to send stop signal: {err:?}"));
            }
        }
        if let Err(err) = self
            .event_tx
            .send(LoaderEvent::Stopped(self.stop_behavior.clone()))
        {
            self.console
                .warning(format!("failed to send stop event: {err}"));
        }
        log::trace!("LoaderActor stopped");
    }
}

impl Handler<LoadModule> for LoaderActor {
    type Result = ();

    fn handle(&mut self, msg: LoadModule, ctx: &mut Context<Self>) -> Self::Result {
        self.console.info(format!("Loading module {:?}", msg.0));

        if let Some(counter) = self.counter.as_ref() {
            counter.fetch_add(1, Ordering::SeqCst);
        }

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
        self.console
            .info(format!("Reloading module {:?}: {reason}", msg.0));
        if let Some(counter) = self.counter.as_ref() {
            counter.fetch_add(1, Ordering::SeqCst);
        }

        self.load_module(ctx.address(), msg.0);
    }
}

impl Handler<LoadedModule> for LoaderActor {
    type Result = ();

    fn handle(&mut self, msg: LoadedModule, ctx: &mut Context<Self>) -> Self::Result {
        let LoadedModule(path, tg_infos) = msg;

        if let Err(e) = self
            .event_tx
            .send(LoaderEvent::Typegraph(Box::new(tg_infos)))
        {
            self.console
                .error(format!("failed to send typegraph: {:?}", e));
            if self.counter.is_some() {
                // auto stop
                ctx.stop();
                return;
            }
        }

        self.console.debug(format!("Loaded 1 file from {path:?}"));
        if let Some(counter) = self.counter.as_ref() {
            let count = counter.fetch_sub(1, Ordering::SeqCst);
            if count == 1 {
                self.console
                    .debug("All modules have been loaded. Stopping the loader.".to_string());
                ctx.notify(TryStop(StopBehavior::ExitSuccess));
            }
        }
    }
}

impl Handler<TryStop> for LoaderActor {
    type Result = ();

    fn handle(&mut self, msg: TryStop, ctx: &mut Context<Self>) -> Self::Result {
        self.stop_behavior = msg.0;
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
