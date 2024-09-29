// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::{
    t::{TypeBuilder, TypeDef},
    wasm::{
        self,
        core::RuntimeId,
        runtimes::{TemporalOperationData, TemporalOperationType},
    },
    Result,
};

pub use crate::wasm::runtimes::TemporalRuntimeData;

#[derive(Debug)]
pub struct TemporalRuntime {
    id: RuntimeId,
    #[allow(unused)]
    options: TemporalRuntimeData,
}

impl TemporalRuntime {
    pub fn new(options: TemporalRuntimeData) -> Result<Self> {
        let id = wasm::with_runtimes(|r, s| r.call_register_temporal_runtime(s, &options))?;

        Ok(Self { id, options })
    }

    pub fn start_workflow<T: TypeBuilder>(&self, workflow_type: &str, arg: T) -> Result<TypeDef> {
        self.operation(
            TemporalOperationType::StartWorkflow,
            Some(workflow_type),
            Some(arg.into_id()?),
            None,
        )
    }

    pub fn signal_workflow<T: TypeBuilder>(&self, signal_name: &str, arg: T) -> Result<TypeDef> {
        self.operation(
            TemporalOperationType::SignalWorkflow,
            Some(signal_name),
            Some(arg.into_id()?),
            None,
        )
    }

    pub fn query_workflow<I, O>(&self, signal_name: &str, arg: I, out: O) -> Result<TypeDef>
    where
        I: TypeBuilder,
        O: TypeBuilder,
    {
        self.operation(
            TemporalOperationType::QueryWorkflow,
            Some(signal_name),
            Some(arg.into_id()?),
            Some(out.into_id()?),
        )
    }

    pub fn describe_workflow(&self) -> Result<TypeDef> {
        self.operation(TemporalOperationType::DescribeWorkflow, None, None, None)
    }

    fn operation(
        &self,
        operation: TemporalOperationType,
        mat_arg: Option<&str>,
        func_arg: Option<u32>,
        func_out: Option<u32>,
    ) -> Result<TypeDef> {
        let data = TemporalOperationData {
            mat_arg: mat_arg.map(|arg| arg.to_string()),
            func_arg,
            func_out,
            operation,
        };

        let params =
            wasm::with_runtimes(|r, s| r.call_generate_temporal_operation(s, self.id, &data))?;

        params.build()
    }
}
