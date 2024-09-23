use crate::{
    t::{self, TypeBuilder},
    wasm::{
        self,
        core::TypeId,
        runtimes::{
            BaseMaterializer, Effect, HttpMethod, HttpRuntimeData, MaterializerHttpRequest,
            RuntimeId,
        },
    },
    Result,
};

impl Default for HttpMethod {
    fn default() -> Self {
        Self::Get
    }
}

#[derive(Debug)]
pub struct HttpRuntime {
    id: RuntimeId,
}

impl HttpRuntime {
    pub fn new(
        endpoint: &str,
        cert_secret: Option<&str>,
        basic_auth_secret: Option<&str>,
    ) -> Result<Self> {
        let data = HttpRuntimeData {
            endpoint: endpoint.to_string(),
            cert_secret: cert_secret.as_ref().map(|v| v.to_string()),
            basic_auth_secret: basic_auth_secret.as_ref().map(|v| v.to_string()),
        };

        let id = wasm::with_runtimes(|r, s| r.call_register_http_runtime(s, &data))?;

        Ok(Self { id })
    }

    pub fn get<I, O>(&self, inp: I, out: O, options: HttpRequestOption) -> Result<TypeId>
    where
        I: TypeBuilder,
        O: TypeBuilder,
    {
        self.request(inp, out, HttpMethod::Get, Effect::Read, options)
    }

    pub fn post<I, O>(&self, inp: I, out: O, options: HttpRequestOption) -> Result<TypeId>
    where
        I: TypeBuilder,
        O: TypeBuilder,
    {
        self.request(inp, out, HttpMethod::Post, Effect::Create(false), options)
    }

    pub fn put<I, O>(&self, inp: I, out: O, options: HttpRequestOption) -> Result<TypeId>
    where
        I: TypeBuilder,
        O: TypeBuilder,
    {
        self.request(inp, out, HttpMethod::Put, Effect::Update(false), options)
    }

    pub fn patch<I, O>(&self, inp: I, out: O, options: HttpRequestOption) -> Result<TypeId>
    where
        I: TypeBuilder,
        O: TypeBuilder,
    {
        self.request(inp, out, HttpMethod::Patch, Effect::Update(false), options)
    }

    pub fn delete<I, O>(&self, inp: I, out: O, options: HttpRequestOption) -> Result<TypeId>
    where
        I: TypeBuilder,
        O: TypeBuilder,
    {
        self.request(inp, out, HttpMethod::Delete, Effect::Delete(false), options)
    }

    fn request<I, O>(
        &self,
        inp: I,
        out: O,
        method: HttpMethod,
        effect: Effect,
        options: HttpRequestOption,
    ) -> Result<TypeId>
    where
        I: TypeBuilder,
        O: TypeBuilder,
    {
        let base = BaseMaterializer {
            runtime: self.id,
            effect,
        };

        let mat = MaterializerHttpRequest {
            method,
            path: options.path,
            content_type: options.content_type,
            header_prefix: options.header_prefix,
            query_fields: options.query_fields,
            rename_fields: None,
            body_fields: None,
            auth_token_field: None,
        };

        let mat = wasm::with_runtimes(|r, s| r.call_http_request(s, base, &mat))?;

        t::func(inp, out, mat)?.build()
    }
}

#[derive(Debug, Default)]
pub struct HttpRequestOption {
    path: String,
    content_type: Option<String>,
    header_prefix: Option<String>,
    query_fields: Option<Vec<String>>,
}

impl HttpRequestOption {
    pub fn path(mut self, path: &str) -> Self {
        self.path = path.to_string();
        self
    }

    pub fn content_type(mut self, content: impl ToString) -> Self {
        self.content_type = Some(content.to_string());
        self
    }

    pub fn header_prefix(mut self, prefix: impl ToString) -> Self {
        self.header_prefix = Some(prefix.to_string());
        self
    }

    pub fn query_fields(mut self, fields: impl IntoIterator<Item = impl ToString>) -> Self {
        self.header_prefix = Some(fields.into_iter().map(|f| f.to_string()).collect());
        self
    }
}
