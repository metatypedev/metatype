// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::config::Config;
use actix_web::{get, post, App, HttpResponse, HttpServer, Responder};
use serde_json::json;

#[get("/config")]
async fn config() -> impl Responder {
    // 1. Deploy|Undeploy may point to a given node
    // 2. Serialize does not require a node,
    // how to share config between the actors and the server?

    let config = Config::default_in(".");

    // does not work
    // 3. maybe use a global var for Config and use that accross all
    // let node = config.node(args, target);

    // 4. share from global variable, just set it whenever the relevant actor is called

    let ret = json!({
        "baseUrl": "",
        "auth": json!({
            "user": "admin",
            "password": "password"
        }),
        "artifactsConfig": json!({
            "dir": config.base_dir.display().to_string(),
            "prismaMigration": json!({
                "migrationDir": ".",
                "create": true,
                "action": json!({
                    "create": true,
                    "reset": false,
                }),
            }),
        }),
        "secrets": json!({}),
        "cliVersion": ""
    });

    HttpResponse::Ok().json(ret)
}

#[get("/command")]
async fn command(req_body: String) -> impl Responder {
    println!("{}", req_body);
    HttpResponse::Ok().body(req_body)
}

#[post("/response")]
async fn response(req_body: String) -> impl Responder {
    HttpResponse::Ok().body(req_body)
}

pub async fn spawn_server() -> std::io::Result<()> {
    println!("Server is running..");
    HttpServer::new(|| {
        App::new()
            .service(config)
            .service(command)
            .service(response)
    })
    .bind(("127.0.0.1", 1234))?
    .run()
    .await
}
