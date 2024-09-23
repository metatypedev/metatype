use async_trait::async_trait;
use clap::{Parser, ValueEnum};

use crate::interlude::*;

use super::{Action, ConfigArgs};

#[derive(ValueEnum, Debug, Clone)]
enum Template {
    Rust,
    Python,
    Typescript,
}

#[derive(Parser, Debug)]
pub struct CreateFdkTemplate {
    /// Target directory
    #[clap(long)]
    dir: String,

    /// Template to create
    #[clap(long)]
    template: Template,
}

#[async_trait]
impl Action for CreateFdkTemplate {
    #[tracing::instrument]
    async fn run(&self, args: ConfigArgs) -> Result<()> {
        let dir = args.dir()?.join(&self.dir);
        tracing::info!("creating fdk template at {:?}", dir);

        tokio::fs::create_dir_all(&dir)
            .await
            .context("failed to create target directory")?;

        let template = match self.template {
            Template::Rust => metagen::FDK_RUST_DEFAULT_TEMPLATE,
            Template::Python => metagen::FDK_PYTHON_DEFAULT_TEMPLATE,
            Template::Typescript => metagen::FDK_TYPESCRIPT_DEFAULT_TEMPLATE,
        };

        for (file_name, content) in template.iter() {
            let path = dir.join(file_name);
            tokio::fs::write(&path, content)
                .await
                .context("failed to write the template into the file")?;
        }

        Ok(())
    }
}
