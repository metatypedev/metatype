use crate::{
    policy::AsPolicySpec,
    t::TypeBuilder,
    wasm::{
        self,
        core::{Cors, Rate, TypegraphInitParams},
    },
    Result,
};

impl Default for TypegraphInitParams {
    fn default() -> Self {
        Self {
            name: String::default(),
            path: file!().to_string(), // FIXME: correctly implement this
            dynamic: None,
            prefix: None,
            cors: Cors::default(),
            rate: None,
        }
    }
}

impl Default for Cors {
    fn default() -> Self {
        Self {
            allow_origin: vec![],
            allow_headers: vec![],
            expose_headers: vec![],
            allow_methods: vec![],
            allow_credentials: true,
            max_age_sec: None,
        }
    }
}

#[allow(clippy::derivable_impls)]
impl Default for Rate {
    fn default() -> Self {
        Self {
            window_limit: 0,
            window_sec: 0,
            query_limit: 0,
            context_identifier: None,
            local_excess: 0,
        }
    }
}

#[derive(Debug)]
pub struct TypegraphBuilder {
    params: TypegraphInitParams,
}

impl TypegraphBuilder {
    pub fn new(name: &str) -> Self {
        Self {
            params: TypegraphInitParams {
                name: name.to_string(),
                ..Default::default()
            },
        }
    }

    pub fn dynamic(mut self) -> Self {
        self.params.dynamic = Some(true);
        self
    }

    pub fn prefix(mut self, prefix: &str) -> Self {
        self.params.prefix = prefix.to_string().into();
        self
    }

    pub fn allow_origin(mut self, allow: impl IntoIterator<Item = impl ToString>) -> Self {
        self.params.cors.allow_origin = allow.into_iter().map(|v| v.to_string()).collect();
        self
    }

    pub fn allow_headers(mut self, allow: impl IntoIterator<Item = impl ToString>) -> Self {
        self.params.cors.allow_headers = allow.into_iter().map(|v| v.to_string()).collect();
        self
    }

    pub fn allow_methods(mut self, allow: impl IntoIterator<Item = impl ToString>) -> Self {
        self.params.cors.allow_methods = allow.into_iter().map(|v| v.to_string()).collect();
        self
    }

    pub fn allow_credentials(mut self, allow: bool) -> Self {
        self.params.cors.allow_credentials = allow;
        self
    }

    pub fn max_age_sec(mut self, max: u32) -> Self {
        self.params.cors.max_age_sec = Some(max);
        self
    }

    pub fn window_limit(mut self, limit: u32) -> Self {
        self.params.rate.get_or_insert(Rate {
            window_limit: limit,
            ..Default::default()
        });
        self
    }

    pub fn window_sec(mut self, sec: u32) -> Self {
        self.params.rate.get_or_insert(Rate {
            window_sec: sec,
            ..Default::default()
        });
        self
    }

    pub fn query_limit(mut self, limit: u32) -> Self {
        self.params.rate.get_or_insert(Rate {
            query_limit: limit,
            ..Default::default()
        });
        self
    }

    pub fn local_excess(mut self, excess: u32) -> Self {
        self.params.rate.get_or_insert(Rate {
            local_excess: excess,
            ..Default::default()
        });
        self
    }

    pub fn context_identifier(mut self, identifier: &str) -> Self {
        self.params.rate.get_or_insert(Rate {
            context_identifier: identifier.to_string().into(),
            ..Default::default()
        });
        self
    }

    pub fn build(self) -> Result<Typegraph> {
        wasm::with_core(|c, s| c.call_init_typegraph(s, &self.params))?;

        Ok(Typegraph {
            params: self.params,
        })
    }
}

#[derive(Debug)]
pub struct Typegraph {
    #[allow(unused)]
    params: TypegraphInitParams,
}

impl Typegraph {
    pub fn expose(
        &self,
        exports: impl IntoIterator<Item = (impl ToString, impl TypeBuilder)>,
        default_policy: Option<impl AsPolicySpec>,
    ) -> Result<()> {
        let exports = exports
            .into_iter()
            .map(|(name, ty)| ty.into_id().map(|id| (name.to_string(), id)))
            .collect::<Result<Vec<_>>>()?;
        let policy = default_policy.map(|p| p.as_policy_spec());
        wasm::with_core(|c, s| c.call_expose(s, &exports, policy.as_slice().into()))
    }
}
