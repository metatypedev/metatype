use crate::{
    t::{TypeBuilder, TypeDef},
    wasm::{
        self,
        core::RuntimeId,
        runtimes::{SubstantialOperationData, SubstantialOperationType, SubstantialRuntimeData},
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

    // TODO
    // pub fn start(&self) -> Result<TypeDef> {}
    //
    // pub fn stop(&self) -> Result<TypeDef> {}
    //
    // pub fn send<T: TypeBuilder>(&self, payload: T) -> Result<TypeDef> {}

    fn operation<T: TypeBuilder>(
        &self,
        kind: SubstantialOperationType,
        arg: Option<T>,
    ) -> Result<TypeDef> {
        let func_arg = match arg {
            Some(arg) => Some(arg.into_id()?),
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
