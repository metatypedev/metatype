use crate::{interlude::*, *};

mod fixtures;
pub use fixtures::*;

#[derive(Clone)]
struct TestCtx {
    typegraphs: Arc<HashMap<String, Typegraph>>,
}

impl InputResolver for TestCtx {
    async fn resolve(&self, order: GeneratorInputOrder) -> anyhow::Result<GeneratorInputResolved> {
        match order {
            GeneratorInputOrder::TypegraphDesc { name } => {
                Ok(GeneratorInputResolved::TypegraphDesc {
                    raw: self.typegraphs.get(&name).unwrap().clone(),
                })
            }
        }
    }
}

pub struct BuildArgs {
    pub path: PathBuf,
}

type BoxFuture<T> = std::pin::Pin<Box<dyn std::future::Future<Output = T> + Send + Sync + 'static>>;

pub struct E2eTestCase {
    pub target: String,
    pub config: config::Config,
    pub target_dir: PathBuf,
    pub typegraphs: HashMap<String, Typegraph>,
    pub build_fn: fn(BuildArgs) -> BoxFuture<anyhow::Result<()>>,
}

pub async fn e2e_test(cases: Vec<E2eTestCase>) -> anyhow::Result<()> {
    // spin_up_typegate
    for case in cases {
        let tmp_dir = tokio::task::spawn_blocking(|| tempfile::tempdir())
            .await??
            .into_path();
        {
            let mut dir = tokio::fs::read_dir(&case.target_dir).await?;
            while let Some(entry) = dir.next_entry().await? {
                let entry_path = entry.path();
                let target_path = tmp_dir.join(entry.path().strip_prefix(&case.target_dir)?);
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
        let files = crate::generate_target(&case.config, &case.target, test_cx).await?;
        for (path, buf) in files {
            let path = tmp_dir.join(path);
            tokio::fs::create_dir_all(path.parent().unwrap()).await?;
            tokio::fs::write(path, buf).await?;
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
        tokio::fs::remove_dir(tmp_dir).await?;
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
        .args(&["r", "-p", "typegate"])
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
        Default::default(),
    )?;
    Ok((typegate, node))
}
