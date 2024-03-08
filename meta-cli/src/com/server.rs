// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::com::{
    responses::{CLIResponseError, CLIResponseSuccess, SDKResponse},
    store::ServerStore,
};
use actix_web::{
    get, post,
    web::{PayloadConfig, Query},
    App, HttpRequest, HttpResponse, HttpServer, Responder,
};
use lazy_static::lazy_static;
use reqwest::StatusCode;
use serde::Deserialize;
use serde_json::json;
use std::{
    io::{Error, ErrorKind},
    net::{Ipv4Addr, SocketAddrV4, TcpListener},
    path::PathBuf,
    sync::Arc,
};

pub struct PortManager {
    pub tcp_listener: Arc<TcpListener>,
}

impl PortManager {
    pub fn new() -> Self {
        let addr = SocketAddrV4::new(Ipv4Addr::UNSPECIFIED, 0);
        Self {
            tcp_listener: Arc::new(TcpListener::bind(addr).unwrap()),
        }
    }
}

lazy_static! {
    pub static ref PORT_MAN: Arc<PortManager> = Arc::new(PortManager::new());
}

pub fn get_instance_port() -> u16 {
    PORT_MAN.tcp_listener.local_addr().unwrap().port()
}

#[derive(Debug, Deserialize)]
struct QueryConfigParams {
    typegraph: String,
    typegraph_path: PathBuf,
}

#[get("/config")]
async fn config(req: HttpRequest) -> impl Responder {
    let parsed = Query::<QueryConfigParams>::from_query(req.query_string()).unwrap();

    let mut artefact_base_dir = parsed.typegraph_path.clone();
    artefact_base_dir.pop(); // pop file.ext

    let endpoint = ServerStore::get_endpoint();
    let secrets = ServerStore::get_secrets();
    let migration_action = ServerStore::get_migration_action(&parsed.typegraph_path);

    let prefix = ServerStore::get_prefix();
    match ServerStore::get_config() {
        Some(config) => {
            let data = json!({
                "typegate": {
                    "endpoint": endpoint.typegate,
                    "auth": endpoint.auth
                },
                "secrets": secrets,
                "prefix": prefix,
                "artifactsConfig": {
                    // on sdk's side, cwd will match to the parent process (cli)
                    // thus `dir` must be explicitly set to the canonical typegraph's `workdir`
                    "dir": artefact_base_dir,
                    "prismaMigration": {
                        // only the cli is aware of the convention migrationDir := tg_workdir + config_folder + tg_name
                        "migrationDir": config.prisma_migrations_dir_rel(&parsed.typegraph),
                        "action": serde_json::to_value(migration_action).unwrap()
                    },
                },
            });

            HttpResponse::Ok()
                .status(StatusCode::OK)
                .json(CLIResponseSuccess { data })
        }
        None => HttpResponse::Ok()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .json(CLIResponseError {
                error: "Could not get config from meta-cli".to_string(),
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
                error: "Could not get command from meta-cli".to_string(),
            }),
    }
}

#[post("/response")]
async fn response(req_body: String) -> impl Responder {
    let sdk_response: SDKResponse = serde_json::from_str(&req_body).unwrap();
    // to be used later
    ServerStore::add_response(sdk_response.typegraph_path.clone(), sdk_response.clone());
    HttpResponse::Ok()
        .status(StatusCode::OK)
        .json(CLIResponseSuccess {
            data: serde_json::to_value("ok").unwrap(),
        })
}

pub async fn spawn_server() -> std::io::Result<()> {
    let port = get_instance_port();

    let tcp_listener = PORT_MAN
        .tcp_listener
        .try_clone()
        .map_err(|e| Error::new(ErrorKind::AddrNotAvailable, e.to_string()))?;

    eprintln!("Server is running at {:?}", port);
    HttpServer::new(|| {
        App::new()
            .service(config)
            .service(command)
            .service(response)
            .app_data(PayloadConfig::new(1000000 * 100))
    })
    .listen(tcp_listener)?
    .run()
    .await?;

    Ok(())
}
