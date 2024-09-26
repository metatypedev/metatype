use crate::{
    t::TypeBuilder,
    wasm::{
        self,
        core::{RuntimeId, TypeId},
        runtimes::{GrpcData, GrpcRuntimeData},
    },
    Result,
};

#[derive(Debug)]
pub struct GrpcRuntime {
    id: RuntimeId,
}

impl GrpcRuntime {
    pub fn new(proto_file: &str, endpoint: &str) -> Result<Self> {
        let data = GrpcRuntimeData {
            proto_file: proto_file.to_string(),
            endpoint: endpoint.to_string(),
        };

        let id = wasm::with_runtimes(|r, s| r.call_register_grpc_runtime(s, &data))?;

        Ok(Self { id })
    }

    pub fn call(&self, method: &str) -> Result<TypeId> {
        let data = GrpcData {
            method: method.to_string(),
        };

        wasm::with_runtimes(|r, s| r.call_call_grpc_method(s, self.id, &data))?.build()
    }
}
