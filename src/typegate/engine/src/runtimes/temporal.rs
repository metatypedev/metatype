// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

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
    clients: Arc<DashMap<String, RetryClient<Client>>>,
}

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct TemporalRegisterInput {
    url: String,
    namespace: String,
    client_id: String,
}

#[deno_core::op2(async)]
pub async fn op_temporal_register(
    state: Rc<RefCell<OpState>>,
    // #[state] ctx: &mut Ctx,
    #[serde] input: TemporalRegisterInput,
) -> Result<(), OpErr> {
    let opts = ClientOptionsBuilder::default()
        .identity("integ_tester".to_string())
        .target_url(Url::from_str(&input.url).unwrap())
        .client_name("temporal-core".to_string())
        .client_version("0.1.0".to_string())
        .build()
        .map_err(OpErr::map())?;
    let client = opts
        .connect(input.namespace, None, None)
        .await
        .map_err(OpErr::map())?;

    let state = state.borrow();
    let ctx = state.borrow::<Ctx>();
    ctx.clients.insert(input.client_id, client);
    Ok(())
}

#[deno_core::op2(fast)]
pub fn op_temporal_unregister(
    #[state] ctx: &mut Ctx,
    #[string] client_id: &str,
) -> Result<(), OpErr> {
    let Some((_, _client)) = ctx.clients.remove(client_id) else {
        return Err(
            anyhow::anyhow!("Could not remove engine {:?}: entry not found.", {
                client_id
            })
            .into(),
        );
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
) -> Result<String, OpErr> {
    let clients = {
        let state = state.borrow();
        let ctx = state.borrow::<Ctx>();
        ctx.clients.clone()
    };
    let client_id = input.client_id;
    let client = clients
        .get(&client_id)
        .with_context(|| format!("Could not find engine '{client_id}"))
        .map_err(OpErr::map())?;

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
        .await
        .map_err(OpErr::map())?;

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
    args: Option<Vec<String>>,
}

#[deno_core::op2(async)]
#[serde]
pub async fn op_temporal_workflow_signal(
    state: Rc<RefCell<OpState>>,
    #[serde] input: TemporalWorkflowSignalInput,
) -> Result<(), OpErr> {
    let clients = {
        let state = state.borrow();
        let ctx = state.borrow::<Ctx>();
        ctx.clients.clone()
    };
    let client_id = input.client_id;
    let client = clients
        .get(&client_id)
        .with_context(|| format!("Could not find engine '{client_id}"))
        .map_err(OpErr::map())?;

    // empty response
    client
        .signal_workflow_execution(
            input.workflow_id,
            input.run_id,
            input.signal_name,
            input.args.map(|args| Payloads {
                payloads: args.into_iter().map(json_payload).collect(),
            }),
            input.request_id,
        )
        .await
        .map_err(OpErr::map())?;

    Ok(())
}

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct TemporalWorkflowQueryInput {
    client_id: String,
    workflow_id: String,
    run_id: String,
    query_type: String,
    args: Option<Vec<String>>,
}

#[deno_core::op2(async)]
#[serde]
pub async fn op_temporal_workflow_query(
    state: Rc<RefCell<OpState>>,
    #[serde] input: TemporalWorkflowQueryInput,
) -> Result<Vec<String>, OpErr> {
    use temporal_sdk_core_protos::temporal::api::query::v1::WorkflowQuery;
    let clients = {
        let state = state.borrow();
        let ctx = state.borrow::<Ctx>();
        ctx.clients.clone()
    };

    let client_id = input.client_id;
    let client = clients
        .get(&client_id)
        .with_context(|| format!("Could not find engine '{client_id}"))
        .map_err(OpErr::map())?;

    let query = client
        .query_workflow_execution(
            input.workflow_id,
            input.run_id,
            WorkflowQuery {
                query_type: input.query_type,
                query_args: input.args.map(|args| Payloads {
                    payloads: args.into_iter().map(json_payload).collect(),
                }),
                header: None,
            },
        )
        .await
        .map_err(OpErr::map())?;

    if let Some(query_results) = query.query_result {
        Ok(query_results
            .payloads
            .into_iter()
            .map(|payload| String::from_utf8(payload.data).unwrap())
            .collect())
    } else {
        Err(anyhow::anyhow!("Query failed: {:?}", query).into())
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
) -> Result<TemporalWorkflowDescribeOutput, OpErr> {
    let clients = {
        let state = state.borrow();
        let ctx = state.borrow::<Ctx>();
        ctx.clients.clone()
    };
    let client_id = input.client_id;
    let client = clients
        .get(&client_id)
        .with_context(|| format!("Could not find engine '{client_id}"))?;

    // empty response
    let mut query = client
        .describe_workflow_execution(input.workflow_id, Some(input.run_id))
        .await
        .map_err(OpErr::map())?;

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
