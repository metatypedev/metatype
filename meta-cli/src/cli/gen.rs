// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::cli::{Action, ConfigArgs};
use actix_web::dev::ServerHandle;
use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;

use super::generators::{codegen::Codegen, metagen::MetaGen};

#[derive(Parser, Debug)]
pub enum Generators {
    Metagen(MetaGen),
    Codegen(Codegen),
}

#[derive(Parser, Debug)]
pub struct Gen {
    #[clap(subcommand)]
    generators: Generators,
}

#[async_trait]
impl Action for Gen {
    async fn run(&self, args: ConfigArgs, server_handle: Option<ServerHandle>) -> Result<()> {
        match &self.generators {
            Generators::Metagen(metagen) => metagen.run(args, server_handle).await?,
            Generators::Codegen(codegen) => codegen.run(args, server_handle).await?,
        };
        Ok(())
    }
}
