// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use super::{Action, CommonArgs, GenArgs};
use crate::config::Config;
use crate::typegraph::postprocess;
use crate::typegraph::push::{PushLoopBuilder, PushQueueEntry};
use crate::typegraph::TypegraphLoader;
use crate::utils::ensure_venv;
use anyhow::{bail, Context, Result};
use async_trait::async_trait;
use clap::Parser;
use log::error;
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Parser, Debug)]
pub struct Deploy {
    #[command(flatten)]
    node: CommonArgs,

    /// Load specific typegraph from a file
    #[clap(short, long)]
    file: Option<String>,

    /// Do not run prisma migrations
    #[clap(long, default_value_t = false)]
    no_migrations: bool,

    // TODO incompatible with --no-migrations
    /// Allow deployment on dirty (git) repository
    #[clap(long, default_value_t = false)]
    allow_dirty: bool,
    // TODO exit_on_error
}

#[async_trait]
impl Action for Deploy {
    async fn run(&self, args: GenArgs) -> Result<()> {
        let dir = args.dir;
        let config_path = args.config;
        ensure_venv(&dir)?;
        let config = Config::load_or_find(config_path, &dir)?;

        let loader = TypegraphLoader::with_config(&config);
        let loader = if self.no_migrations {
            loader
        } else {
            loader.with_postprocessor(
                postprocess::prisma_rt::EmbedPrismaMigrations::default()
                    .allow_dirty(self.allow_dirty),
            )
        };

        let loaded = if let Some(file) = self.file.clone() {
            let mut ret = HashMap::default();
            let file: PathBuf = file.into();
            let res = loader
                .load_file(&file)
                .with_context(|| format!("Error while loading typegraphs from {file:?}"))?;
            if let Some(tgs) = res {
                ret.insert(file, Ok(tgs));
            }
            // TODO: else what??
            ret
        } else {
            loader.load_folder(&dir)?
        };

        if loaded.is_empty() {
            bail!("No typegraph found!");
        }

        let node_config = config.node("deploy").with_args(&self.node);

        let node = node_config.clone().try_into()?;

        let push_loop = PushLoopBuilder::on(node)
            .exit(true)
            .start_with(
                loaded
                    .into_iter()
                    .filter_map(|(path, typegraphs)| match typegraphs {
                        Err(err) => {
                            #[cfg(debug_assertions)]
                            error!("{err:?}");
                            error!("Could not load typegraphs from {:?}", path);
                            None
                        }
                        Ok(tgs) => Some(
                            tgs.into_iter()
                                .map(move |tg| PushQueueEntry::new(path.clone(), tg)),
                        ),
                    })
                    .flatten(),
            )
            .await?;
        push_loop.join().await?;

        Ok(())
    }
}
//
// async fn deploy_loaded_typegraphs(dir: String, loaded: LoaderResult, node: &Node) -> Result<()> {
//     let diff_base = Path::new(&dir).to_path_buf().canonicalize().unwrap();
//
//     for (path, res) in loaded.into_iter() {
//         let tgs = res.with_context(|| format!("Error while loading typegraphs from {path:?}"))?;
//         let path = utils::relative_path_display(diff_base.clone(), path);
//         println!(
//             "Loading {count} typegraphs{s} from {path}:",
//             count = tgs.len(),
//             s = utils::plural_prefix(tgs.len())
//         );
//         for tg in tgs.iter() {
//             println!(
//                 "  → Pushing typegraph {name}...",
//                 name = tg.name().unwrap().blue()
//             );
//             match push_typegraph(tg, node, 0).await {
//                 Ok(res) => {
//                     println!("  {}", "✓ Success!".to_owned().green());
//                     let name = res.name;
//                     for msg in res.messages.into_iter() {
//                         let type_ = match msg.type_ {
//                             MessageType::Info => "info".blue(),
//                             MessageType::Warning => "warn".yellow(),
//                             MessageType::Error => "error".red(),
//                         };
//                         let tg_name = name.green();
//                         println!("    [{tg_name} {type_}] {}", msg.text);
//                     }
//                 }
//                 Err(e) => {
//                     println!("  {}", "✗ Failed!".to_owned().red());
//                     bail!(e);
//                 }
//             }
//         }
//     }
//
//     Ok(())
// }
