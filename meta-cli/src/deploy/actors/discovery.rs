// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::deploy::actors::task_manager::{self, TaskReason};
use crate::interlude::*;

use pathdiff::diff_paths;

use crate::{config::Config, typegraph::loader::Discovery};

use super::console::{Console, ConsoleActor};
use super::task::action::TaskAction;
use super::task_manager::{TaskGenerator, TaskManager};

pub struct DiscoveryActor<A: TaskAction + 'static> {
    config: Arc<Config>,
    task_generator: TaskGenerator,
    task_manager: Addr<TaskManager<A>>,
    console: Addr<ConsoleActor>,
    directory: Arc<Path>,
}

impl<A: TaskAction + 'static> DiscoveryActor<A> {
    pub fn new(
        config: Arc<Config>,
        task_generator: TaskGenerator,
        task_manager: Addr<TaskManager<A>>,
        console: Addr<ConsoleActor>,
        directory: Arc<Path>,
    ) -> Self {
        Self {
            config,
            task_generator,
            task_manager,
            console,
            directory,
        }
    }
}

#[derive(Message)]
#[rtype(result = "()")]
struct Stop;

impl<A: TaskAction + 'static> Actor for DiscoveryActor<A> {
    type Context = Context<Self>;

    #[tracing::instrument(skip(self))]
    fn started(&mut self, ctx: &mut Self::Context) {
        log::trace!("DiscoveryActor started; directory={:?}", self.directory);

        let config = Arc::clone(&self.config);
        let dir = self.directory.clone();
        let task_manager = self.task_manager.clone();
        let console = self.console.clone();
        let discovery = ctx.address();
        let task_generator = self.task_generator.clone();

        let fut = async move {
            match Discovery::new(config, dir.to_path_buf())
                .start(|path| match path {
                    Ok(path) => {
                        let rel_path = diff_paths(&path, &dir).unwrap();
                        task_manager.do_send(task_manager::message::AddTask {
                            task_ref: task_generator.generate(rel_path.into(), 0),
                            reason: TaskReason::Discovery,
                        });
                    }
                    Err(err) => console.error(format!("Error while discovering modules: {}", err)),
                })
                .await
            {
                Ok(_) => (),
                Err(err) => console.error(format!("Error while discovering modules: {}", err)),
            }

            discovery.do_send(Stop);
        }
        .in_current_span();
        ctx.spawn(fut.into_actor(self));
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        log::trace!("DiscoveryActor stopped");
    }
}

impl<A: TaskAction + 'static> Handler<Stop> for DiscoveryActor<A> {
    type Result = ();

    fn handle(&mut self, msg: Stop, ctx: &mut Self::Context) -> Self::Result {
        match msg {
            Stop => ctx.stop(),
        }
    }
}
