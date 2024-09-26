use crate::{
    t::{self, TypeBuilder},
    wasm::{
        self,
        core::{RuntimeId, TypeId},
        runtimes::{BaseMaterializer, Effect, GraphqlRuntimeData, MaterializerGraphqlQuery},
    },
    Result,
};

#[derive(Debug)]
pub struct GraphqlRuntime {
    id: RuntimeId,
}

impl GraphqlRuntime {
    pub fn new(endpoint: &str) -> Result<Self> {
        let data = GraphqlRuntimeData {
            endpoint: endpoint.to_string(),
        };

        let id = wasm::with_runtimes(|r, s| r.call_register_graphql_runtime(s, &data))?;

        Ok(Self { id })
    }

    pub fn query<I, O>(
        &self,
        inp: I,
        out: O,
        path: Option<impl IntoIterator<Item = impl ToString>>,
    ) -> Result<TypeId>
    where
        I: TypeBuilder,
        O: TypeBuilder,
    {
        let base = BaseMaterializer {
            runtime: self.id,
            effect: Effect::Read,
        };

        let mat = MaterializerGraphqlQuery {
            path: path.map(|path| path.into_iter().map(|p| p.to_string()).collect()),
        };

        let mat = wasm::with_runtimes(|r, s| r.call_graphql_query(s, base, &mat))?;

        t::func(inp, out, mat)?.build()
    }

    pub fn mutation<I, O>(
        &self,
        inp: I,
        out: O,
        path: Option<impl IntoIterator<Item = impl ToString>>,
    ) -> Result<TypeId>
    where
        I: TypeBuilder,
        O: TypeBuilder,
    {
        let base = BaseMaterializer {
            runtime: self.id,
            effect: Effect::Read,
        };

        let mat = MaterializerGraphqlQuery {
            path: path.map(|path| path.into_iter().map(|p| p.to_string()).collect()),
        };

        let mat = wasm::with_runtimes(|r, s| r.call_graphql_mutation(s, base, &mat))?;

        t::func(inp, out, mat)?.build()
    }
}
