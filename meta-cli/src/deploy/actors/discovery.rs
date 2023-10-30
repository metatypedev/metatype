use actix::prelude::*;
use pathdiff::diff_paths;
use std::{path::PathBuf, sync::Arc};

use crate::{config::Config, typegraph::loader::Discovery};

use super::console::{error, info, ConsoleActor};
use super::loader::{LoadModule, LoaderActor};

pub struct DiscoveryActor {
    config: Arc<Config>,
    loader: Addr<LoaderActor>,
    console: Addr<ConsoleActor>,
    directory: PathBuf,
}

impl Actor for DiscoveryActor {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Self::Context) {
        let config = Arc::clone(&self.config);
        let dir = self.directory.clone();
        let loader = self.loader.clone();
        let console = self.console.clone();
        Arbiter::current().spawn(async move {
            match Discovery::new(config, dir.clone())
                .start(|path| match path {
                    Ok(path) => {
                        let rel_path = diff_paths(path.as_path(), dir.as_path()).unwrap();
                        info!(
                            console,
                            "Found typegraph definition module at {}",
                            rel_path.display()
                        );
                        loader.do_send(LoadModule(path));
                    }
                    Err(err) => error!(console, "Error while discovering modules: {}", err),
                })
                .await
            {
                Ok(_) => (),
                Err(err) => error!(console, "Error while discovering modules: {}", err),
            }
        });
    }
}
