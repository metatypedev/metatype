// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use super::deploy::Deploy;
use super::deploy::DeployOptions;
use super::Action;
use super::CommonArgs;
use super::GenArgs;
use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;

#[derive(Parser, Debug)]
pub struct Dev {
    #[command(flatten)]
    node: CommonArgs,

    #[clap(long, default_value_t = 5000)]
    port: u32,

    #[clap(long, default_value_t = false)]
    run_destructive_migrations: bool,
}

#[async_trait]
impl Action for Dev {
    async fn run(&self, args: GenArgs) -> Result<()> {
        let options = DeployOptions {
            codegen: true,
            allow_dirty: true,
            allow_destructive: self.run_destructive_migrations,
            watch: true,
            target: "dev".to_owned(),
            no_migration: false,
        };

        let deploy = Deploy::new(self.node.clone(), options, None);
        deploy.run(args).await

        // let port = self.port;
        // tokio::task::spawn_blocking(move || {
        //     let server = Server::http(format!("0.0.0.0:{}", port)).unwrap();
        //
        //     for request in server.incoming_requests() {
        //         let url = Url::parse(&format!("http://dummy{}", request.url())).unwrap();
        //         let query: HashMap<String, String> = url.query_pairs().into_owned().collect();
        //
        //         // let tg_node = node.clone();
        //         let response = match url.path() {
        //             "/dev" => match query.get("node") {
        //                 Some(_node) => {
        //                     loader.reload_all().unwrap();
        //                     Response::from_string(json!({"message": "reloaded"}).to_string())
        //                         .with_header(
        //                             "Content-Type: application/json".parse::<Header>().unwrap(),
        //                         )
        //                 }
        //                 _ => Response::from_string(
        //                     json!({"error": "missing query 'node"}).to_string(),
        //                 )
        //                 .with_status_code(400)
        //                 .with_header("Content-Type: application/json".parse::<Header>().unwrap()),
        //             },
        //             _ => Response::from_string(json!({"error": "not found"}).to_string())
        //                 .with_status_code(404)
        //                 .with_header("Content-Type: application/json".parse::<Header>().unwrap()),
        //         };
        //
        //         request.respond(response).unwrap();
        //     }
        // });
        //
        // push_loop.join().await?;
    }
}
