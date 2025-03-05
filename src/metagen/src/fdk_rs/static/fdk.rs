// gen-start
#![allow(dead_code)]

pub mod wit {
    wit_bindgen::generate!({
        pub_export_macro: true,
        // wit-start
        // this bit gets replaced by the inline wit string
        world: "wit-wire",
        path: "../../../../wit",
        // wit-end
    });
}

use std::cell::RefCell;
use std::collections::HashMap;

use wit::exports::metatype::wit_wire::mat_wire::*;
use wit::metatype::wit_wire::typegate_wire::hostcall;

pub type HandlerFn = Box<dyn Fn(&str, Ctx) -> Result<String, HandleErr>>;

pub struct ErasedHandler {
    mat_id: String,
    mat_trait: String,
    mat_title: String,
    handler_fn: HandlerFn,
}

pub struct MatBuilder {
    handlers: HashMap<String, ErasedHandler>,
}

impl Default for MatBuilder {
    fn default() -> Self {
        Self::new()
    }
}

impl MatBuilder {
    pub fn new() -> Self {
        Self {
            handlers: Default::default(),
        }
    }

    pub fn register_handler(mut self, handler: ErasedHandler) -> Self {
        self.handlers.insert(handler.mat_trait.clone(), handler);
        self
    }
}

pub struct Router {
    handlers: HashMap<String, ErasedHandler>,
}

impl Router {
    pub fn from_builder(builder: MatBuilder) -> Self {
        Self {
            handlers: builder.handlers,
        }
    }

    pub fn init(&self, args: InitArgs) -> Result<InitResponse, InitError> {
        static MT_VERSION: &str = "__METATYPE_VERSION__";
        if args.metatype_version != MT_VERSION {
            return Err(InitError::VersionMismatch(MT_VERSION.into()));
        }
        for info in args.expected_ops {
            let mat_trait = stubs::op_to_trait_name(&info.op_name);
            if !self.handlers.contains_key(mat_trait) {
                return Err(InitError::UnexpectedMat(info));
            }
        }
        Ok(InitResponse { ok: true })
    }

    pub fn handle(&self, req: HandleReq) -> Result<String, HandleErr> {
        let mat_trait = stubs::op_to_trait_name(&req.op_name);
        let Some(handler) = self.handlers.get(mat_trait) else {
            return Err(HandleErr::NoHandler);
        };
        // metagen-genif HOSTCALL
        let qg = query_graph();
        // metagen-endif
        let cx = Ctx {
            // metagen-genif HOSTCALL
            host: transports::hostcall(&qg),
            qg,
            // metagen-endif
        };
        (handler.handler_fn)(&req.in_json, cx)
    }
}

pub type InitCallback = fn() -> anyhow::Result<MatBuilder>;

thread_local! {
    pub static MAT_STATE: RefCell<Router> = panic!("MAT_STATE has not been initialized");
}

// metagen-genif IGNORE
// these are stubs to items that cum from client.rs
pub struct QueryGraph;
fn query_graph() -> QueryGraph {
    QueryGraph
}
mod transports {
    pub fn hostcall(_qg: &super::QueryGraph) -> metagen_client::hostcall::HostcallTransport {
        todo!()
    }
}
// metagen-endif

pub struct Ctx {
    // metagen-genif HOSTCALL
    pub qg: QueryGraph,
    pub host: metagen_client::hostcall::HostcallTransport,
    // metagen-endif
}

impl Ctx {
    pub fn gql<O>(
        &self,
        query: &str,
        variables: impl Into<serde_json::Value>,
    ) -> Result<O, GraphqlRunError>
    where
        O: serde::de::DeserializeOwned,
    {
        match hostcall(
            "gql",
            &serde_json::to_string(&serde_json::json!({
                "query": query,
                "variables": variables.into(),
            }))?,
        ) {
            Ok(json) => Ok(serde_json::from_str(&json[..])?),
            Err(json) => Err(GraphqlRunError::HostError(serde_json::from_str(&json)?)),
        }
    }
}

#[derive(Debug)]
pub enum GraphqlRunError {
    JsonError(serde_json::Error),
    HostError(serde_json::Value),
}

impl std::error::Error for GraphqlRunError {}

impl From<serde_json::Error> for GraphqlRunError {
    fn from(value: serde_json::Error) -> Self {
        Self::JsonError(value)
    }
}

impl std::fmt::Display for GraphqlRunError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            GraphqlRunError::JsonError(msg) => write!(f, "json error: {msg}"),
            GraphqlRunError::HostError(serde_json::Value::Object(map))
                if map.contains_key("message") =>
            {
                write!(f, "host error: {}", map["message"])
            }
            GraphqlRunError::HostError(val) => write!(f, "host error: {val:?}"),
        }
    }
}

#[macro_export]
macro_rules! init_mat {
    (hook: $init_hook:expr) => {
        struct MatWireGuest;
        use wit::exports::metatype::wit_wire::mat_wire::*;
        wit::export!(MatWireGuest with_types_in wit);

        #[allow(unused)]
        impl Guest for MatWireGuest {
            fn handle(req: HandleReq) -> Result<String, HandleErr> {
                MAT_STATE.with(|router| {
                    let router = router.borrow();
                    router.handle(req)
                })
            }

            fn init(args: InitArgs) -> Result<InitResponse, InitError> {
                let hook = $init_hook;
                let router = Router::from_builder(hook());
                let resp = router.init(args)?;
                MAT_STATE.set(router);
                Ok(resp)
            }
        }
    };
}
// gen-end
mod stubs {
    pub fn op_to_trait_name(op_name: &str) -> &'static str {
        panic!("unrecognized op_name: {op_name}");
    }
}
