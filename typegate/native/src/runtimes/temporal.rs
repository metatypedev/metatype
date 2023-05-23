// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::RT;
use anyhow::Context;
use dashmap::DashMap;
use macros::deno;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::str::FromStr;
use temporal_client::{Client, ClientOptionsBuilder, RetryClient};
use temporal_client::{WorkflowClientTrait, WorkflowOptions};
use temporal_sdk_core_protos::temporal::api::common::v1::{Payload, Payloads};

use url::Url;

static CLIENTS: Lazy<DashMap<String, RetryClient<Client>>> = Lazy::new(DashMap::new);

#[deno]
struct TemporalRegisterInput {
    url: String,
    namespace: String,
    client_id: String,
}

#[deno]
enum TemporalRegisterOutput {
    Ok,
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
    CLIENTS.insert(input.client_id, client);
    TemporalRegisterOutput::Ok
}

#[deno]
struct TemporalUnregisterInput {
    client_id: String,
}

#[deno]
enum TemporalUnregisterOutput {
    Ok,
    Err { message: String },
}

#[deno]
fn temporal_unregister(input: TemporalUnregisterInput) -> TemporalUnregisterOutput {
    let Some((_, _client)) = CLIENTS.remove(&input.client_id) else {
        return TemporalUnregisterOutput::Err { message: format!("Could not remove engine {:?}: entry not found.", {input.client_id})};
    };
    TemporalUnregisterOutput::Ok
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

#[deno]
struct TemporalWorkflowSignalInput {
    client_id: String,
    workflow_id: String,
    run_id: String,
    signal_name: String,
    request_id: Option<String>,
    args: Option<String>,
}

#[deno]
enum TemporalWorkflowSignalOutput {
    Ok,
    Err { message: String },
}

#[deno]
fn temporal_workflow_signal(input: TemporalWorkflowSignalInput) -> TemporalWorkflowSignalOutput {
    let client_id = input.client_id;
    let client = CLIENTS
        .get(&client_id)
        .with_context(|| format!("Cound not find engine '{client_id}"))
        .unwrap();

    // empty response
    RT.block_on(client.signal_workflow_execution(
        input.workflow_id,
        input.run_id,
        input.signal_name,
        input.args.map(|arg| Payloads {
            payloads: vec![json_payload(arg)],
        }),
        input.request_id,
    ))
    .unwrap();

    TemporalWorkflowSignalOutput::Ok
}

#[deno]
struct TemporalWorkflowQueryInput {
    client_id: String,
    workflow_id: String,
    run_id: String,
    query_type: String,
    args: Option<String>,
}

#[deno]
enum TemporalWorkflowQueryOutput {
    Ok { data: Vec<String> },
    Err { message: String },
}

#[deno]
fn temporal_workflow_query(input: TemporalWorkflowQueryInput) -> TemporalWorkflowQueryOutput {
    use temporal_sdk_core_protos::temporal::api::query::v1::WorkflowQuery;

    let client_id = input.client_id;
    let client = CLIENTS
        .get(&client_id)
        .with_context(|| format!("Cound not find engine '{client_id}"))
        .unwrap();

    // empty response
    let query = RT
        .block_on(client.query_workflow_execution(
            input.workflow_id,
            input.run_id,
            WorkflowQuery {
                query_type: input.query_type,
                query_args: input.args.map(|arg| Payloads {
                    payloads: vec![json_payload(arg)],
                }),
                header: None,
            },
        ))
        .unwrap();

    if let Some(query_results) = query.query_result {
        TemporalWorkflowQueryOutput::Ok {
            data: query_results
                .payloads
                .into_iter()
                .map(|payload| String::from_utf8(payload.data).unwrap())
                .collect(),
        }
    } else {
        TemporalWorkflowQueryOutput::Err {
            message: format!("Query failed: {:?}", query),
        }
    }
}

#[deno]
struct TemporalWorkflowDescribeInput {
    client_id: String,
    workflow_id: String,
    run_id: String,
}

#[deno]
enum TemporalWorkflowDescribeOutput {
    Ok {
        start_time: Option<i64>,
        close_time: Option<i64>,
        state: Option<i32>,
    },
    Err {
        message: String,
    },
}

#[deno]
fn temporal_workflow_describe(
    input: TemporalWorkflowDescribeInput,
) -> TemporalWorkflowDescribeOutput {
    let client_id = input.client_id;
    let client = CLIENTS
        .get(&client_id)
        .with_context(|| format!("Cound not find engine '{client_id}"))
        .unwrap();

    // empty response
    let mut query = RT
        .block_on(client.describe_workflow_execution(input.workflow_id, Some(input.run_id)))
        .unwrap();

    TemporalWorkflowDescribeOutput::Ok {
        start_time: query
            .workflow_execution_info
            .as_mut()
            .and_then(|t| t.start_time.take())
            .map(|t| t.seconds),
        close_time: query
            .workflow_execution_info
            .as_mut()
            .and_then(|t| t.close_time.take())
            .map(|t| t.seconds),
        state: query.workflow_execution_info.map(|t| t.status),
    }
}
