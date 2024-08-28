#![allow(clippy::not_unsafe_ptr_arg_deref)]

// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::interlude::*;

use common::typegraph::runtimes::substantial::SubstantialBackend;
use substantial::{
    backends::{fs::FsBackend, memory::MemoryBackend, Backend},
    operations::Run,
};

use deno_core::OpState;
#[rustfmt::skip]
use deno_core as deno_core; // necessary for re-exported macros to work

// #[derive(Default)]
// pub struct Ctx {
//     pub runs: Arc<DashMap<String, Run>>,
// }

fn get_backend(kind: &SubstantialBackend) -> Box<dyn Backend> {
    match kind {
        // TODO: generalize
        SubstantialBackend::Fs => Box::new(FsBackend::new(Path::new("tmp"))),
        SubstantialBackend::Memory => Box::new(MemoryBackend::new()),
        SubstantialBackend::Redis(_) => todo!(),
    }
}

#[derive(Deserialize)]
pub struct InitRunInput {
    pub backend: SubstantialBackend,
    pub run_id: String,
}

#[derive(Serialize)]
#[serde(crate = "serde")]
pub struct InitRunOutput {
    pub run: Run,
}

#[deno_core::op2(async)]
#[serde]
pub async fn op_substantial_init_run(
    state: Rc<RefCell<OpState>>,
    #[serde] input: InitRunInput,
) -> Result<InitRunOutput> {
    // TODO: register runs globally
    // let ctx = {
    //     let state = state.borrow();
    //     state.borrow::<Ctx>().clone()
    // };

    // if let Some(run) = ctx.runs.get(&input.run_id) {
    //     let backend = get_backend(&input.backend);
    //     run.init_from(input.run_id.clone(), backend);

    //     Ok(ReadEventOutput { run: run.clone() })
    // } else {
    //     let run = Run::new(input.run_id.clone());

    //     Ok(ReadEventOutput { run })
    // }

    let mut run = Run::new(input.run_id.clone());
    let backend = get_backend(&input.backend);
    run.init_from(backend)?;

    Ok(InitRunOutput { run })
}
