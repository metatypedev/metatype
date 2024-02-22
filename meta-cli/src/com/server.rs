// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::com::store::ServerStore;
use actix_web::{get, post, App, HttpResponse, HttpServer, Responder};
use reqwest::StatusCode;
use serde::Serialize;
use serde_json::{json, Value};

#[derive(Serialize)]
struct ResponseSuccess {
    data: Value,
}

#[derive(Serialize)]
struct ResponseError {
    error: String,
}

#[get("/config")]
async fn config() -> impl Responder {
    match ServerStore::get_config() {
        Some(config) => {
            let endpoints = config
                .typegates
                .iter()
                .map(|(k, v)| serde_json::to_value((k, v)).unwrap())
                .collect::<Vec<_>>();

            let data = json!({
                "endpoints": endpoints,
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

            HttpResponse::Ok()
                .status(StatusCode::OK)
                .json(ResponseSuccess { data })
        }
        None => HttpResponse::Ok()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .json(ResponseError {
                error: "Could not get config".to_string(),
            }),
    }
}

#[get("/command")]
async fn command() -> impl Responder {
    match ServerStore::get_command() {
        Some(command) => HttpResponse::Ok()
            .status(StatusCode::OK)
            .json(ResponseSuccess {
                data: serde_json::to_value(command).unwrap(),
            }),
        None => HttpResponse::Ok()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .json(ResponseError {
                error: "Could not get command".to_string(),
            }),
    }
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
