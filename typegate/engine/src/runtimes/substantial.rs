#![allow(clippy::not_unsafe_ptr_arg_deref)]

// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::interlude::*;

use common::typegraph::runtimes::substantial::SubstantialBackend;
use dashmap::DashMap;
use deno_core::OpState;
use substantial::{
    backends::{fs::FsBackend, memory::MemoryBackend, Backend},
    operations::Run,
};

#[rustfmt::skip]
use deno_core as deno_core; // necessary for re-exported macros to work

#[derive(Clone, Default)]
pub struct Ctx {
    pub backends: Arc<DashMap<String, Box<dyn Backend>>>,
}

fn get_backend(kind: &SubstantialBackend) -> Box<dyn Backend> {
    match kind {
        // TODO: generalize
        SubstantialBackend::Fs => Box::new(FsBackend::new(Path::new("tmp"))),
        SubstantialBackend::Memory => Box::new(MemoryBackend::new()),
        SubstantialBackend::Redis(_) => todo!(),
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

#[deno_core::op2]
#[serde]
pub fn op_create_or_get_run(
    state: Rc<RefCell<OpState>>,
    #[serde] input: CreateOrGetInput,
) -> Result<CreateOrGetOutput> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.run_id.clone())
        .or_insert_with(|| get_backend(&input.backend));

    let mut run = Run::new(input.run_id.clone());
    run.init_from(backend.as_ref())?;

    Ok(CreateOrGetOutput { run })
}

#[derive(Deserialize)]
pub struct PersistRunInput {
    pub run: Run,
    pub backend: SubstantialBackend,
}

#[deno_core::op2]
#[string]
pub fn op_persist_run(
    state: Rc<RefCell<OpState>>,
    #[serde] input: PersistRunInput,
) -> Result<String> {
    let ctx = {
        let state = state.borrow();
        state.borrow::<Ctx>().clone()
    };

    let backend = ctx
        .backends
        .entry(input.run.run_id.clone())
        .or_insert_with(|| get_backend(&input.backend));

    input.run.materialize_into(backend.as_ref())?;

    Ok(input.run.run_id)
}
