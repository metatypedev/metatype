// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use crate::RT;
use anyhow::Context;
use dashmap::DashMap;
use lazy_static::lazy_static;
use macros::deno;
use std::collections::HashMap;
use std::str::FromStr;
use temporal_client::{Client, ClientOptionsBuilder, RetryClient};
use temporal_client::{WorkflowClientTrait, WorkflowOptions};
use temporal_sdk_core_protos::temporal::api::common::v1::Payload;

use url::Url;

lazy_static! {
    static ref CLIENTS: DashMap<String, RetryClient<Client>> = DashMap::new();
}

#[deno]
struct TemporalRegisterInput {
    url: String,
    namespace: String,
    typegraph: String,
}

#[deno]
enum TemporalRegisterOutput {
    Ok { client_id: String },
    Err { message: String },
}

#[deno]
fn temporal_register(input: TemporalRegisterInput) -> TemporalRegisterOutput {
    let opts = ClientOptionsBuilder::default()
        .identity("integ_tester".to_string())
        .target_url(Url::from_str(&input.url).unwrap())
        .client_name("temporal-core".to_string())
        .client_version("0.1.0".to_string())
        .build()
        .unwrap();
    let connection = opts.connect("default", None, None);
    let client = RT.block_on(connection).unwrap();

    let typegraph = input.typegraph;
    let client_id = format!("{typegraph}_{}", CLIENTS.len() + 1);
    CLIENTS.insert(client_id.clone(), client);
    TemporalRegisterOutput::Ok { client_id }
}

#[deno]
struct TemporalUnregisterInput {
    client_id: String,
}

#[deno]
enum TemporalUnregisterOutput {
    Ok { client_id: String },
    Err { message: String },
}

#[deno]
fn temporal_unregister(input: TemporalUnregisterInput) -> TemporalUnregisterOutput {
    let Some((client_id, _client)) = CLIENTS.remove(&input.client_id) else {
        return TemporalUnregisterOutput::Err { message: format!("Could not remove engine {:?}: entry not found.", {input.client_id})};
    };
    TemporalUnregisterOutput::Ok { client_id }
}

#[deno]
struct TemporalWorkflowStartInput {
    client_id: String,
    workflow_id: String,
    workflow_type: String,
    task_queue: String,
    request_id: Option<String>,
    args: Vec<String>,
}

#[deno]
enum TemporalWorkflowStartOutput {
    Ok { run_id: String },
    Err { message: String },
}

#[deno]
fn temporal_workflow_start(input: TemporalWorkflowStartInput) -> TemporalWorkflowStartOutput {
    let client_id = input.client_id;
    let client = CLIENTS
        .get(&client_id)
        .with_context(|| format!("Cound not find engine '{client_id}"))
        .unwrap();

    let run = RT
        .block_on(
            client.start_workflow(
                input
                    .args
                    .iter()
                    .map(|arg| json_payload(arg.clone()))
                    .collect(),
                input.task_queue,
                input.workflow_id,
                input.workflow_type,
                input.request_id,
                WorkflowOptions::default(),
            ),
        )
        .unwrap();

    TemporalWorkflowStartOutput::Ok { run_id: run.run_id }
}

fn json_payload(json: String) -> Payload {
    let mut metadata = HashMap::new();
    metadata.insert("encoding".to_string(), b"json/plain".to_vec());
    Payload {
        metadata,
        data: json.into_bytes(),
    }
}
