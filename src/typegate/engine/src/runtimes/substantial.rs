#![allow(clippy::not_unsafe_ptr_arg_deref)]

// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::interlude::*;

use chrono::{DateTime, Utc};
use common::typegraph::runtimes::substantial::SubstantialBackend;
use dashmap::DashMap;
use deno_core::OpState;
use substantial::{
    backends::{fs::FsBackend, memory::MemoryBackend, redis::RedisBackend, Backend, NextRun},
    converters::{MetadataEvent, Operation, Run},
};

#[rustfmt::skip]
use deno_core as deno_core; // necessary for re-exported macros to work

#[derive(Clone, Default)]
pub struct Ctx {
    pub backends: Arc<DashMap<String, Rc<dyn Backend>>>,
}

fn init_backend(kind: &SubstantialBackend) -> Result<Rc<dyn Backend>> {
    match kind {
        SubstantialBackend::Fs => {
            let tmp_dir = std::env::var("TMP_DIR")
                .map(|p| PathBuf::from(&p))
                .expect("invalid TMP_DIR");
            let root = tmp_dir.join("substantial").join("fs_backend");

            Ok(Rc::new(FsBackend::new(root).get()))
        }
        SubstantialBackend::Memory => Ok(Rc::new(MemoryBackend::default().get())),
        SubstantialBackend::Redis(cfg) => Ok(Rc::new(RedisBackend::new(
            cfg.connection_string.clone(),
            Some("typegate".to_owned()),
        )?)),
    }
}

#[derive(Deserialize)]
pub struct CreateOrGetInput {
    pub backend: SubstantialBackend,
    pub run_id: String,
}

#[derive(Serialize)]
#[serde(crate = "serde")]
pub struct CreateOrGetOutput {
    pub run: Run,
}

#[deno_core::op2(async)]
#[serde]
pub async fn op_sub_store_create_or_get_run(
    state: Rc<RefCell<OpState>>,
    #[serde] input: CreateOrGetInput,
) -> Result<CreateOrGetOutput> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))?;

    let mut run = Run::new(input.run_id);
    run.recover_from(backend.as_ref())?;

    Ok(CreateOrGetOutput { run })
}

#[derive(Deserialize)]
pub struct PersistRunInput {
    pub run: Run,
    pub backend: SubstantialBackend,
}

#[deno_core::op2(async)]
#[string]
pub async fn op_sub_store_persist_run(
    state: Rc<RefCell<OpState>>,
    #[serde] input: PersistRunInput,
) -> Result<String> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))?;

    input.run.persist_into(backend.as_ref())?;

    Ok(input.run.run_id)
}

#[derive(Deserialize)]
pub struct AddScheduleInput {
    pub backend: SubstantialBackend,
    pub run_id: String,
    pub queue: String,
    pub schedule: DateTime<Utc>,
    pub operation: Option<Operation>,
}

#[deno_core::op2(async)]
pub async fn op_sub_store_add_schedule(
    state: Rc<RefCell<OpState>>,
    #[serde] input: AddScheduleInput,
) -> Result<()> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))?;

    backend.add_schedule(
        input.queue.clone(),
        input.run_id.clone(),
        input.schedule,
        input.operation.map(|op| op.try_into()).transpose()?,
    )
}

#[derive(Deserialize)]
pub struct ReadOrCloseScheduleInput {
    pub backend: SubstantialBackend,
    pub run_id: String,
    pub queue: String,
    pub schedule: DateTime<Utc>,
}

#[deno_core::op2(async)]
#[serde]
pub async fn op_sub_store_read_schedule(
    state: Rc<RefCell<OpState>>,
    #[serde] input: ReadOrCloseScheduleInput,
) -> Result<Option<Operation>> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))?;

    match backend.read_schedule(input.queue.clone(), input.run_id.clone(), input.schedule) {
        Ok(opt_event) => opt_event.map(|event| event.try_into()).transpose(),
        Err(e) => Err(e),
    }
}

#[deno_core::op2(async)]
#[serde]
pub async fn op_sub_store_close_schedule(
    state: Rc<RefCell<OpState>>,
    #[serde] input: ReadOrCloseScheduleInput,
) -> Result<()> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))?;

    backend.close_schedule(input.queue.clone(), input.run_id.clone(), input.schedule)
}

#[derive(Deserialize)]
pub struct NextRunInput {
    pub backend: SubstantialBackend,
    pub queue: String,
    pub exclude: Vec<String>,
}

#[deno_core::op2(async)]
#[serde]
pub async fn op_sub_agent_next_run(
    state: Rc<RefCell<OpState>>,
    #[serde] input: NextRunInput,
) -> Result<Option<NextRun>> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))?;

    backend.next_run(input.queue.clone(), input.exclude)
}

#[derive(Deserialize)]
pub struct ActiveLeaseInput {
    pub backend: SubstantialBackend,
    pub lease_seconds: u32,
}

#[deno_core::op2(async)]
#[serde]
pub async fn op_sub_agent_active_leases(
    state: Rc<RefCell<OpState>>,
    #[serde] input: ActiveLeaseInput,
) -> Result<Vec<String>> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))?;

    backend.active_leases(input.lease_seconds)
}

#[derive(Deserialize)]
pub struct LeaseInput {
    pub backend: SubstantialBackend,
    pub run_id: String,
    pub lease_seconds: u32,
}

#[deno_core::op2(async)]
pub async fn op_sub_agent_acquire_lease(
    state: Rc<RefCell<OpState>>,
    #[serde] input: LeaseInput,
) -> Result<bool> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))?;

    backend.acquire_lease(input.run_id.clone(), input.lease_seconds)
}

#[deno_core::op2(async)]
pub async fn op_sub_agent_renew_lease(
    state: Rc<RefCell<OpState>>,
    #[serde] input: LeaseInput,
) -> Result<bool> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))?;

    backend.renew_lease(input.run_id.clone(), input.lease_seconds)
}

#[deno_core::op2(async)]
pub async fn op_sub_agent_remove_lease(
    state: Rc<RefCell<OpState>>,
    #[serde] input: LeaseInput,
) -> Result<()> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))?;

    backend.remove_lease(input.run_id.clone(), input.lease_seconds)
}

#[derive(Deserialize)]
pub struct ReadAllMetadataInput {
    pub backend: SubstantialBackend,
    pub run_id: String,
}

#[deno_core::op2(async)]
#[serde]
pub async fn op_sub_metadata_read_all(
    state: Rc<RefCell<OpState>>,
    #[serde] input: ReadAllMetadataInput,
) -> Result<Vec<MetadataEvent>> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))?;

    let metadatas = backend.read_all_metadata(input.run_id)?;
    metadatas
        .into_iter()
        .map(|proto| proto.try_into())
        .collect::<Result<Vec<_>>>()
}

#[derive(Deserialize)]
pub struct AppendMetadataInput {
    pub backend: SubstantialBackend,
    pub run_id: String,
    pub schedule: DateTime<Utc>,
    pub content: serde_json::Value,
}

#[deno_core::op2(async)]
pub async fn op_sub_metadata_append(
    state: Rc<RefCell<OpState>>,
    #[serde] input: AppendMetadataInput,
) -> Result<()> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))?;

    backend.append_metadata(
        input.run_id.clone(),
        input.schedule,
        serde_json::to_string(&input.content)?,
    )
}

#[derive(Deserialize)]
pub struct WriteLinkInput {
    pub backend: SubstantialBackend,
    pub workflow_name: String,
    pub run_id: String,
}

#[deno_core::op2(async)]
pub async fn op_sub_metadata_write_workflow_link(
    state: Rc<RefCell<OpState>>,
    #[serde] input: WriteLinkInput,
) -> Result<()> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))?;

    backend.write_workflow_link(input.workflow_name.clone(), input.run_id)
}

#[derive(Deserialize)]
pub struct ReadWorkflowLinkInput {
    pub backend: SubstantialBackend,
    pub workflow_name: String,
}

#[deno_core::op2(async)]
#[serde]
pub async fn op_sub_metadata_read_workflow_links(
    state: Rc<RefCell<OpState>>,
    #[serde] input: ReadWorkflowLinkInput,
) -> Result<Vec<String>> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))?;

    backend.read_workflow_links(input.workflow_name)
}
