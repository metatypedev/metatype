// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::net::{Ipv4Addr, SocketAddrV4, TcpListener};

use crate::com::store::ServerStore;
use actix_web::{get, post, web::Query, App, HttpRequest, HttpResponse, HttpServer, Responder};
use lazy_static::lazy_static;
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

pub fn random_free_port() -> u16 {
    let addr = SocketAddrV4::new(Ipv4Addr::UNSPECIFIED, 0);
    TcpListener::bind(addr)
        .unwrap()
        .local_addr()
        .unwrap()
        .port()
}

lazy_static! {
    #[derive(Debug)]
    pub static ref SERVER_PORT: u16 = random_free_port();
}

#[derive(Serialize)]
struct CLIResponseSuccess {
    data: Value,
}

#[derive(Serialize)]
struct CLIResponseError {
    error: String,
}

#[derive(Debug, Deserialize)]
struct QueryConfigParams {
    typegraph: String,
}

#[get("/config")]
async fn config(req: HttpRequest) -> impl Responder {
    let parsed = Query::<QueryConfigParams>::from_query(req.query_string());
    let folder = match parsed {
        Ok(p) => p.typegraph.to_owned(),
        Err(_) => "".to_string(),
    };
    let endpoint = ServerStore::get_endpoint();
    match ServerStore::get_config() {
        Some(config) => {
            let data = json!({
                "typegate": {
                    "endpoint": endpoint.typegate,
                    "auth": endpoint.auth
                },
                "secrets": ServerStore::get_secrets(),
                "artifactsConfig": json!({
                    "dir": config.base_dir.display().to_string(),
                    "prismaMigration": {
                        "migrationDir": config.prisma_migrations_dir(&folder),
                        "action": {
                            // TODO:
                            "create": true,
                            "reset": false,
                        },
                    },
                }),
            });

            HttpResponse::Ok()
                .status(StatusCode::OK)
                .json(CLIResponseSuccess { data })
        }
        None => HttpResponse::Ok()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .json(CLIResponseError {
                error: "Could not get config".to_string(),
            }),
    }
}

#[get("/command")]
async fn command() -> impl Responder {
    match ServerStore::get_command() {
        Some(command) => HttpResponse::Ok()
            .status(StatusCode::OK)
            .json(CLIResponseSuccess {
                data: serde_json::to_value(command).unwrap(),
            }),
        None => HttpResponse::Ok()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .json(CLIResponseError {
                error: "Could not get command".to_string(),
            }),
    }
}

#[post("/response")]
async fn response(req_body: String) -> impl Responder {
    HttpResponse::Ok().body(req_body)
}

pub async fn spawn_server() -> std::io::Result<()> {
    let port = SERVER_PORT.to_owned();
    eprintln!("Server is running at {:?}", port);
    HttpServer::new(|| {
        App::new()
            .service(config)
            .service(command)
            .service(response)
    })
    .bind(("127.0.0.1", port))?
    .run()
    .await
}
