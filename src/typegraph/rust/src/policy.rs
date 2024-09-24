use crate::{
    wasm::{
        self,
        core::{ContextCheck, MaterializerId, Policy as CorePolicy, PolicyId},
    },
    Result,
};

#[derive(Debug)]
pub struct Policy {
    _id: PolicyId,
    name: String,
}

impl Policy {
    pub fn name(&self) -> &str {
        &self.name
    }

    pub fn public() -> Result<Self> {
        let (id, name) = wasm::with_core(|c, s| c.call_get_public_policy(s))?;

        Ok(Self { _id: id, name })
    }

    pub fn internal() -> Result<Self> {
        let (id, name) = wasm::with_core(|c, s| c.call_get_internal_policy(s))?;

        Ok(Self { _id: id, name })
    }

    pub fn context(key: &str, check: ContextCheck) -> Result<Self> {
        let (id, name) = wasm::with_core(|c, s| c.call_register_context_policy(s, key, &check))?;

        Ok(Self { _id: id, name })
    }

    pub fn new(name: &str, materializer: MaterializerId) -> Result<Self> {
        let data = CorePolicy {
            name: name.to_string(),
            materializer,
        };

        let id = wasm::with_core(|c, s| c.call_register_policy(s, &data))?;

        Ok(Self {
            _id: id,
            name: name.to_string(),
        })
    }

    // TODO
    // pub fn on() {}
}
