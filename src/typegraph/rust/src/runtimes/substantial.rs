use crate::{
    t::TypeBuilder,
    wasm::{
        self,
        core::{RuntimeId, TypeId},
        runtimes::{
            SubstantialOperationData, SubstantialOperationType, SubstantialRuntimeData, Workflow,
        },
    },
    Result,
};

#[derive(Debug)]
pub struct SubstantialRuntime {
    id: RuntimeId,
    endpoint: String,
}

impl SubstantialRuntime {
    pub fn new(endpoint: &str, basic_auth_secret: Option<&str>) -> Result<Self> {
        let data = SubstantialRuntimeData {
            endpoint: endpoint.to_string(),
            basic_auth_secret: basic_auth_secret.map(|s| s.to_string()),
        };

        let id = wasm::with_runtimes(|r, s| r.call_register_substantial_runtime(s, &data))?;

        Ok(Self {
            id,
            endpoint: endpoint.to_string(),
        })
    }

    pub fn start(&self) -> Result<TypeId> {
        todo!()
    }

    pub fn stop(&self) -> Result<TypeId> {
        todo!()
    }

    pub fn send<T: TypeBuilder>(&self, payload: T) -> Result<TypeId> {
        todo!()
    }

    fn operation<T: TypeBuilder>(
        &self,
        kind: SubstantialOperationType,
        arg: Option<T>,
    ) -> Result<TypeId> {
        let func_arg = match arg {
            Some(arg) => Some(arg.build()?),
            None => None,
        };

        let data = SubstantialOperationData {
            func_arg,
            operation: kind,
        };

        wasm::with_runtimes(|r, s| r.call_generate_substantial_operation(s, self.id, &data))?
            .build()
    }
}
