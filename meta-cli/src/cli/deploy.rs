// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use super::{Action, CommonArgs, GenArgs};
use crate::config::Config;
use crate::typegraph::loader::{Loader, LoaderError, LoaderOptions, LoaderOutput};
use crate::typegraph::postprocess::prisma_rt::EmbedPrismaMigrations;
use crate::typegraph::push::{PushLoopBuilder, PushQueueEntry};
use crate::utils::ensure_venv;
use anyhow::{bail, Result};
use async_trait::async_trait;
use clap::Parser;

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

        let mut loader_options = LoaderOptions::with_config(&config);
        if !self.no_migrations {
            loader_options
                .with_postprocessor(EmbedPrismaMigrations::default().allow_dirty(self.allow_dirty));
        }
        if let Some(file) = self.file.clone() {
            loader_options.file(&file);
        } else {
            loader_options.dir(&dir);
        }
        let mut loader: Loader = loader_options.into();
        let mut push_queue_init = vec![];

        while let Some(output) = loader.next().await {
            match output {
                LoaderOutput::Typegraph { path, typegraph } => {
                    push_queue_init.push(PushQueueEntry::new(path, typegraph))
                }
                LoaderOutput::Rewritten(path) => {
                    println!("Typegraph definition module at {path:?} has been rewritten by an importer.");
                }
                LoaderOutput::Error(LoaderError::PostProcessingError {
                    path,
                    typegraph_name,
                    error,
                }) => {
                    bail!("Error while post processing typegraph {typegraph_name:?} from {path:?}: {error:?}");
                    // bail!(error.with_context(|| format!(
                    //     "Postprocessing typegraph {typegraph_name:?} from {path:?}"
                    // )));
                }
                LoaderOutput::Error(LoaderError::UnknownFileType(path)) => {
                    // TODO command option
                    println!("Unknown file type: {path:?}");
                }
                LoaderOutput::Error(LoaderError::SerdeJson { path, error }) => {
                    bail!("Error while parsing raw string format of the typegraph from {path:?}: {error:?}");
                    // bail!(anyhow!(error).with_context(|| format!(
                    //     "Parsing raw string format of the typegraph from {path:?}"
                    // )));
                }
                LoaderOutput::Error(LoaderError::Unknown { path, error }) => {
                    bail!("Error while loading typegraphs from {path:?}");
                    // bail!(error.with_context(|| format!("Loading typegraphs from {path:?}")));
                }
            }
        }

        if push_queue_init.is_empty() {
            bail!("No typegraph found!");
        }

        let node_config = config.node("deploy").with_args(&self.node);

        let node = node_config.clone().try_into()?;

        let push_loop = PushLoopBuilder::on(node)
            .exit(true)
            .start_with(push_queue_init.into_iter())
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
