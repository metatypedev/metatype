use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Weak};

use common::typegraph::Typegraph;

use actix::prelude::*;
use anyhow::{Context as AnyhowContext, Result};
use indoc::indoc;
use tokio::sync::watch;

use crate::config::Config;
use crate::typegraph::push::PushResult;
use crate::utils::{graphql::Query, Node};

use super::{console::ConsoleActor, loader::LoaderActor};

type Secrets = HashMap<String, String>;
type SecretsTx = watch::Sender<Weak<Secrets>>;
type SecretsRx = watch::Receiver<Weak<Secrets>>;

pub struct Pusher {
    config: Arc<Config>,
    loader: Addr<LoaderActor>,
    console: Addr<ConsoleActor>,
    base_dir: PathBuf,
    node: Arc<Node>,
    secrets_tx: SecretsTx,
}

impl Pusher {
    pub fn new(
        config: Arc<Config>,
        loader: Addr<LoaderActor>,
        console: Addr<ConsoleActor>,
        base_dir: PathBuf,
        node: Node,
    ) -> Self {
        let (secrets_tx, _) = watch::channel(Weak::new());
        Self {
            config,
            loader,
            console,
            base_dir,
            node: Arc::new(node),
            secrets_tx,
        }
    }

    async fn push(
        node: Arc<Node>,
        tg: Arc<Typegraph>,
        mut secrets_rx: SecretsRx,
    ) -> Result<PushResult> {
        // TODO can we set the prefix before the push? // in the loader??
        // so we wont need to clone

        // wait for secrets to be loaded
        // this will return immediately if the secrets are already loaded
        secrets_rx.changed().await?;
        let secrets = secrets_rx.borrow().upgrade().context("secrets")?;

        let tg = &*tg;
        let tg = match node.prefix.as_ref() {
            Some(prefix) => tg.with_prefix(prefix.clone())?,
            None => tg.clone(),
        };
        let res = node
            .post("/typegate")?
            .gql(
                indoc! {"
            mutation InsertTypegraph($tg: String!, $secrets: String!, $cliVersion: String!) {
                addTypegraph(fromString: $tg, secrets: $secrets, cliVersion: $cliVersion) {
                    name
                    messages { type text }
                    migrations { runtime migrations }
                    resetRequired
                }
            }"}
                .to_string(),
                Some(serde_json::json!({
                    "tg": serde_json::to_string(&tg)?,
                    "secrets": serde_json::to_string(&secrets)?,
                    "cliVersion": common::get_version()
                })),
            )
            .await?;

        let mut res: PushResult = res
            .data("addTypegraph")
            .context("addTypegraph field in the response")?;
        res.original_name = Some(tg.name()?);
        Ok(res)
    }
}

// Note: only the LoaderActor stores a non-weak reference to the typegraph

#[derive(Message)]
#[rtype(result = "()")]
pub struct PushTypegraph(pub Arc<Typegraph>);

// TODO message CancelPush

impl Actor for Pusher {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Self::Context) {
        println!("Pusher started");
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        println!("Pusher stopped");
    }
}

impl Handler<PushTypegraph> for Pusher {
    type Result = ();

    fn handle(&mut self, msg: PushTypegraph, _ctx: &mut Self::Context) -> Self::Result {
        let node = Arc::clone(&self.node);
        let secrets_rx = self.secrets_tx.subscribe();
        Arbiter::current().spawn(async move {
            match Self::push(node, msg.0, secrets_rx).await {
                Ok(res) => {
                    println!("Pushed typegraph {}", res.original_name.as_ref().unwrap());
                    println!("{:?}", res);
                }
                Err(e) => {
                    println!("Error pushing typegraph: {}", e);
                }
            }
        });
    }
}
