// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::interlude::*;

use dashmap::DashMap;
use deno_core::OpState;
use std::collections::HashMap;
use std::str::FromStr;
use temporal_client::{Client, ClientOptionsBuilder, RetryClient};
use temporal_client::{WorkflowClientTrait, WorkflowOptions};
use temporal_sdk_core_protos::temporal::api::common::v1::{Payload, Payloads};
#[rustfmt::skip]
use deno_core as deno_core; // necessary for re-exported macros to work

use url::Url;

#[derive(Default)]
pub struct Ctx {
    clients: DashMap<String, RetryClient<Client>>,
}

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct TemporalRegisterInput {
    url: String,
    #[allow(dead_code)]
    namespace: String,
    client_id: String,
}

#[deno_core::op2(async)]
pub async fn op_temporal_register(
    state: Rc<RefCell<OpState>>,
    // #[state] ctx: &mut Ctx,
    #[serde] input: TemporalRegisterInput,
) -> Result<()> {
    let opts = ClientOptionsBuilder::default()
        .identity("integ_tester".to_string())
        .target_url(Url::from_str(&input.url).unwrap())
        .client_name("temporal-core".to_string())
        .client_version("0.1.0".to_string())
        .build()?;
    let client = opts.connect("default", None, None).await?;

    let state = state.borrow();
    let ctx = state.borrow::<Ctx>();
    ctx.clients.insert(input.client_id, client);
    Ok(())
}

#[deno_core::op2(fast)]
pub fn op_temporal_unregister(#[state] ctx: &mut Ctx, #[string] client_id: &str) -> Result<()> {
    let Some((_, _client)) = ctx.clients.remove(client_id) else {
        anyhow::bail!("Could not remove engine {:?}: entry not found.", {
            client_id
        });
    };
    Ok(())
}

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct TemporalWorkflowStartInput {
    client_id: String,
    workflow_id: String,
    workflow_type: String,
    task_queue: String,
    request_id: Option<String>,
    args: Vec<String>,
}

#[deno_core::op2(async)]
#[string]
pub async fn op_temporal_workflow_start(
    state: Rc<RefCell<OpState>>,
    #[serde] input: TemporalWorkflowStartInput,
) -> Result<String> {
    let state = state.borrow();
    let ctx = state.borrow::<Ctx>();
    let client_id = input.client_id;
    let client = ctx
        .clients
        .get(&client_id)
        .with_context(|| format!("Could not find engine '{client_id}"))?;

    let run = client
        .start_workflow(
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
        )
        .await?;

    Ok(run.run_id)
}

fn json_payload(json: String) -> Payload {
    let mut metadata = HashMap::new();
    metadata.insert("encoding".to_string(), b"json/plain".to_vec());
    Payload {
        metadata,
        data: json.into_bytes(),
    }
}

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct TemporalWorkflowSignalInput {
    client_id: String,
    workflow_id: String,
    run_id: String,
    signal_name: String,
    request_id: Option<String>,
    args: Option<String>,
}

#[deno_core::op2(async)]
pub async fn op_temporal_workflow_signal(
    state: Rc<RefCell<OpState>>,
    #[serde] input: TemporalWorkflowSignalInput,
) -> Result<()> {
    let state = state.borrow();
    let ctx = state.borrow::<Ctx>();
    let client_id = input.client_id;
    let client = ctx
        .clients
        .get(&client_id)
        .with_context(|| format!("Could not find engine '{client_id}"))?;

    // empty response
    client
        .signal_workflow_execution(
            input.workflow_id,
            input.run_id,
            input.signal_name,
            input.args.map(|arg| Payloads {
                payloads: vec![json_payload(arg)],
            }),
            input.request_id,
        )
        .await?;

    Ok(())
}

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct TemporalWorkflowQueryInput {
    client_id: String,
    workflow_id: String,
    run_id: String,
    query_type: String,
    args: Option<String>,
}

#[deno_core::op2(async)]
#[serde]
pub async fn op_temporal_workflow_query(
    state: Rc<RefCell<OpState>>,
    #[serde] input: TemporalWorkflowQueryInput,
) -> Result<Vec<String>> {
    use temporal_sdk_core_protos::temporal::api::query::v1::WorkflowQuery;
    let state = state.borrow();
    let ctx = state.borrow::<Ctx>();

    let client_id = input.client_id;
    let client = ctx
        .clients
        .get(&client_id)
        .with_context(|| format!("Could not find engine '{client_id}"))?;

    // empty response
    let query = client
        .query_workflow_execution(
            input.workflow_id,
            input.run_id,
            WorkflowQuery {
                query_type: input.query_type,
                query_args: input.args.map(|arg| Payloads {
                    payloads: vec![json_payload(arg)],
                }),
                header: None,
            },
        )
        .await?;

    if let Some(query_results) = query.query_result {
        Ok(query_results
            .payloads
            .into_iter()
            .map(|payload| String::from_utf8(payload.data).unwrap())
            .collect())
    } else {
        anyhow::bail!("Query failed: {:?}", query);
    }
}

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct TemporalWorkflowDescribeInput {
    client_id: String,
    workflow_id: String,
    run_id: String,
}

#[derive(Serialize)]
#[serde(crate = "serde")]
pub struct TemporalWorkflowDescribeOutput {
    start_time: Option<i64>,
    close_time: Option<i64>,
    state: Option<i32>,
}

#[deno_core::op2(async)]
#[serde]
pub async fn op_temporal_workflow_describe(
    state: Rc<RefCell<OpState>>,
    #[serde] input: TemporalWorkflowDescribeInput,
) -> Result<TemporalWorkflowDescribeOutput> {
    let state = state.borrow();
    let ctx = state.borrow::<Ctx>();
    let client_id = input.client_id;
    let client = ctx
        .clients
        .get(&client_id)
        .with_context(|| format!("Could not find engine '{client_id}"))?;

    // empty response
    let mut query = client
        .describe_workflow_execution(input.workflow_id, Some(input.run_id))
        .await?;

    Ok(TemporalWorkflowDescribeOutput {
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
    })
}
