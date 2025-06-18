#![allow(clippy::not_unsafe_ptr_arg_deref)]

// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;

use chrono::{DateTime, Utc};
use dashmap::DashMap;
use deno_core::OpState;
use substantial::{
    backends::{fs::FsBackend, memory::MemoryBackend, redis::RedisBackend, Backend, NextRun},
    converters::{MetadataEvent, Operation, Run},
};
use tg_schema::runtimes::substantial::SubstantialBackend;

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
            tracing::debug!("Fs Backend root directory {root:?}");

            Ok(Rc::new(FsBackend::new(root).get()))
        }
        SubstantialBackend::Memory => Ok(Rc::new(MemoryBackend::default().get())),
        SubstantialBackend::Redis(cfg) => Ok(Rc::new(RedisBackend::new(
            cfg.connection_string.clone(),
            Some("typegate".to_owned()),
        )?)),
    }
}

#[derive(Deserialize, Debug)]
pub struct CreateOrGetInput {
    pub backend: SubstantialBackend,
    pub run_id: String,
}

#[derive(Serialize, Debug)]
#[serde(crate = "serde")]
pub struct CreateOrGetOutput {
    pub run: Run,
}

#[tracing::instrument(/*ret, */level = "debug", skip(state, input))]
#[deno_core::op2(async)]
#[serde]
pub async fn op_sub_store_create_or_get_run(
    state: Rc<RefCell<OpState>>,
    #[serde] input: CreateOrGetInput,
) -> Result<CreateOrGetOutput, OpErr> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))
        .map_err(OpErr::map())?;

    let mut run = Run::new(input.run_id);
    run.recover_from(backend.as_ref()).map_err(OpErr::map())?;

    Ok(CreateOrGetOutput { run })
}

#[derive(Deserialize, Debug, Clone)]
pub struct PersistRunInput {
    pub run: Run,
    pub backend: SubstantialBackend,
}

#[tracing::instrument(ret, level = "debug", skip(state, input))]
#[deno_core::op2(async)]
#[string]
pub async fn op_sub_store_persist_run(
    state: Rc<RefCell<OpState>>,
    #[serde] input: PersistRunInput,
) -> Result<String, OpErr> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let mut input = input.clone();

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))
        .map_err(OpErr::map())?;

    input
        .run
        .persist_into(backend.as_ref())
        .map_err(OpErr::map())?;

    Ok(input.run.run_id)
}

#[derive(Deserialize, Debug)]
pub struct AddScheduleInput {
    pub backend: SubstantialBackend,
    pub run_id: String,
    pub queue: String,
    pub schedule: DateTime<Utc>,
    pub operation: Option<Operation>,
}

#[tracing::instrument(level = "debug", skip(state))]
#[deno_core::op2(async)]
pub async fn op_sub_store_add_schedule(
    state: Rc<RefCell<OpState>>,
    #[serde] input: AddScheduleInput,
) -> Result<(), OpErr> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))
        .map_err(OpErr::map())?;

    backend
        .add_schedule(
            input.queue.clone(),
            input.run_id.clone(),
            input.schedule,
            input.operation.map(|op| op.try_into()).transpose()?,
        )
        .map_err(OpErr::map())
}

#[derive(Deserialize, Debug)]
pub struct ReadOrCloseScheduleInput {
    pub backend: SubstantialBackend,
    pub run_id: String,
    pub queue: String,
    pub schedule: DateTime<Utc>,
}

#[tracing::instrument(ret, level = "debug", skip(state))]
#[deno_core::op2(async)]
#[serde]
pub async fn op_sub_store_read_schedule(
    state: Rc<RefCell<OpState>>,
    #[serde] input: ReadOrCloseScheduleInput,
) -> Result<Option<Operation>, OpErr> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))
        .map_err(OpErr::map())?;

    match backend
        .read_schedule(input.queue.clone(), input.run_id.clone(), input.schedule)
        .map_err(OpErr::map())
    {
        Ok(opt_event) => opt_event
            .map(|event| event.try_into().map_err(OpErr::map()))
            .transpose(),
        Err(e) => Err(e),
    }
}

#[tracing::instrument(level = "debug", skip(state))]
#[deno_core::op2(async)]
pub async fn op_sub_store_close_schedule(
    state: Rc<RefCell<OpState>>,
    #[serde] input: ReadOrCloseScheduleInput,
) -> Result<(), OpErr> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))
        .map_err(OpErr::map())?;

    backend
        .close_schedule(input.queue.clone(), input.run_id.clone(), input.schedule)
        .map_err(OpErr::map())
}

#[derive(Deserialize, Debug)]
pub struct NextRunInput {
    pub backend: SubstantialBackend,
    pub queue: String,
    pub exclude: Vec<String>,
}

#[tracing::instrument(ret, level = "debug", skip(state))]
#[deno_core::op2(async)]
#[serde]
pub async fn op_sub_agent_next_run(
    state: Rc<RefCell<OpState>>,
    #[serde] input: NextRunInput,
) -> Result<Option<NextRun>, OpErr> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))
        .map_err(OpErr::map())?;

    backend
        .next_run(input.queue.clone(), input.exclude)
        .map_err(OpErr::map())
}

#[derive(Deserialize, Debug)]
pub struct ActiveLeaseInput {
    pub backend: SubstantialBackend,
    pub lease_seconds: u32,
}

// #[tracing::instrument(/*ret,*/ level = "debug", skip(state))]
#[deno_core::op2(async)]
#[serde]
pub async fn op_sub_agent_active_leases(
    state: Rc<RefCell<OpState>>,
    #[serde] input: ActiveLeaseInput,
) -> Result<Vec<String>, OpErr> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))
        .map_err(OpErr::map())?;

    backend
        .active_leases(input.lease_seconds)
        .map_err(OpErr::map())
}

#[derive(Deserialize, Debug)]
pub struct LeaseInput {
    pub backend: SubstantialBackend,
    pub run_id: String,
    pub lease_seconds: u32,
}

#[tracing::instrument(ret, level = "debug", skip(state))]
#[deno_core::op2(async)]
pub async fn op_sub_agent_acquire_lease(
    state: Rc<RefCell<OpState>>,
    #[serde] input: LeaseInput,
) -> Result<bool, OpErr> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))
        .map_err(OpErr::map())?;

    backend
        .acquire_lease(input.run_id.clone(), input.lease_seconds)
        .map_err(OpErr::map())
}

#[tracing::instrument(ret, level = "debug", skip(state))]
#[deno_core::op2(async)]
pub async fn op_sub_agent_renew_lease(
    state: Rc<RefCell<OpState>>,
    #[serde] input: LeaseInput,
) -> Result<bool, OpErr> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))
        .map_err(OpErr::map())?;

    backend
        .renew_lease(input.run_id.clone(), input.lease_seconds)
        .map_err(OpErr::map())
}

#[tracing::instrument(level = "debug", skip(state))]
#[deno_core::op2(async)]
#[serde]
pub async fn op_sub_agent_remove_lease(
    state: Rc<RefCell<OpState>>,
    #[serde] input: LeaseInput,
) -> Result<(), OpErr> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))
        .map_err(OpErr::map())?;

    backend
        .remove_lease(input.run_id.clone(), input.lease_seconds)
        .map_err(OpErr::map())
}

#[derive(Deserialize, Debug)]
pub struct ReadAllMetadataInput {
    pub backend: SubstantialBackend,
    pub run_id: String,
}

// #[tracing::instrument(level = "debug", skip(state))]
#[deno_core::op2(async)]
#[serde]
pub async fn op_sub_metadata_read_all(
    state: Rc<RefCell<OpState>>,
    #[serde] input: ReadAllMetadataInput,
) -> Result<Vec<MetadataEvent>, OpErr> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))
        .map_err(OpErr::map())?;

    let metadatas = backend
        .read_all_metadata(input.run_id)
        .map_err(OpErr::map())?;
    metadatas
        .into_iter()
        .map(|proto| proto.try_into())
        .collect::<Result<Vec<_>>>()
        .map_err(OpErr::map())
}

#[derive(Deserialize, Debug)]
pub struct AppendMetadataInput {
    pub backend: SubstantialBackend,
    pub run_id: String,
    pub schedule: DateTime<Utc>,
    pub content: serde_json::Value,
}

// #[tracing::instrument(level = "debug", skip(state))]
#[deno_core::op2(async)]
#[serde]
pub async fn op_sub_metadata_append(
    state: Rc<RefCell<OpState>>,
    #[serde] input: AppendMetadataInput,
) -> Result<(), OpErr> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))
        .map_err(OpErr::map())?;

    backend
        .append_metadata(
            input.run_id.clone(),
            input.schedule,
            serde_json::to_string(&input.content).map_err(OpErr::map())?,
        )
        .map_err(OpErr::map())
}

#[derive(Deserialize, Debug)]
pub struct WriteLinkInput {
    pub backend: SubstantialBackend,
    pub workflow_name: String,
    pub run_id: String,
}

#[tracing::instrument(level = "debug", skip(state))]
#[deno_core::op2(async)]
#[serde]
pub async fn op_sub_metadata_write_workflow_link(
    state: Rc<RefCell<OpState>>,
    #[serde] input: WriteLinkInput,
) -> Result<(), OpErr> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))
        .map_err(OpErr::map())?;

    backend
        .write_workflow_link(input.workflow_name.clone(), input.run_id)
        .map_err(OpErr::map())
}

#[derive(Deserialize, Debug)]
pub struct ReadWorkflowLinkInput {
    pub backend: SubstantialBackend,
    pub workflow_name: String,
}

// #[tracing::instrument(ret, level = "debug", skip(state))]
#[deno_core::op2(async)]
#[serde]
pub async fn op_sub_metadata_read_workflow_links(
    state: Rc<RefCell<OpState>>,
    #[serde] input: ReadWorkflowLinkInput,
) -> Result<Vec<String>, OpErr> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))
        .map_err(OpErr::map())?;

    backend
        .read_workflow_links(input.workflow_name)
        .map_err(OpErr::map())
}

#[derive(Deserialize, Debug)]
pub struct WriteParentChildLinkInput {
    pub backend: SubstantialBackend,
    pub parent_run_id: String,
    pub child_run_id: String,
}

// #[tracing::instrument(level = "debug", skip(state))]
#[deno_core::op2(async)]
#[serde]
pub async fn op_sub_metadata_write_parent_child_link(
    state: Rc<RefCell<OpState>>,
    #[serde] input: WriteParentChildLinkInput,
) -> Result<(), OpErr> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))
        .map_err(OpErr::map())?;

    backend
        .write_parent_child_link(input.parent_run_id.clone(), input.child_run_id)
        .map_err(OpErr::map())
}

#[derive(Deserialize, Debug)]
pub struct EnumerateAllChildrenInput {
    pub backend: SubstantialBackend,
    pub parent_run_id: String,
}

// #[tracing::instrument(ret, level = "debug", skip(state))]
#[deno_core::op2(async)]
#[serde]
pub async fn op_sub_metadata_enumerate_all_children(
    state: Rc<RefCell<OpState>>,
    #[serde] input: EnumerateAllChildrenInput,
) -> Result<Vec<String>, OpErr> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.backend.as_key())
        .or_try_insert_with(|| init_backend(&input.backend))
        .map_err(OpErr::map())?;

    backend
        .enumerate_all_children(input.parent_run_id.clone())
        .map_err(OpErr::map())
}
