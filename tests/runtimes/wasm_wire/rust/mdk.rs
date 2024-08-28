// This file was @generated by metagen and is intended
// to be generated again on subsequent metagen runs.
#![cfg_attr(rustfmt, rustfmt_skip)]

// gen-static-start
#![allow(dead_code)]

pub mod wit {
    wit_bindgen::generate!({
        pub_export_macro: true,
        
        inline: "package metatype:wit-wire;

interface typegate-wire {
  hostcall: func(op-name: string, json: string) -> result<string, string>;
}

interface mat-wire {
  type json-str = string;

  record mat-info {
    op-name: string,
    mat-title: string,
    mat-hash: string,
    mat-data-json: string,
  }

  record init-args {
    metatype-version: string,
    expected-ops: list<mat-info>
  }

  record init-response {
    ok: bool
  }

  variant init-error {
    version-mismatch(string),
    unexpected-mat(mat-info),
    other(string)
  }

  init: func(args: init-args) -> result<init-response, init-error>;

  record handle-req {
    op-name: string,
    in-json: json-str,
  }

  variant handle-err {
    no-handler,
    in-json-err(string),
    handler-err(string),
  }

  handle: func(req: handle-req) -> result<json-str, handle-err>;
}

world wit-wire {
  import typegate-wire;

  export mat-wire;
}
"
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
        static MT_VERSION: &str = "0.4.9-rc1";
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
        let cx = Ctx {};
        (handler.handler_fn)(&req.in_json, cx)
    }
}

pub type InitCallback = fn() -> anyhow::Result<MatBuilder>;

thread_local! {
    pub static MAT_STATE: RefCell<Router> = panic!("MAT_STATE has not been initialized");
}

pub struct Ctx {}

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
// gen-static-end
use types::*;
pub mod types {
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct AddArgs {
        pub a: f64,
        pub b: f64,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct RangeArgs {
        pub a: Option<i64>,
        pub b: i64,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct Object35 {
    }
    pub type String3 = String;
    pub type String4 = String;
    pub type String6 = String;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct Object9 {
        pub tag: String6,
        pub value: Option<String>,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(untagged)]
    pub enum Either12 {
        String(String),
        F64(f64),
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct Profile {
        pub level: String3,
        pub attributes: Vec<String4>,
        pub category: Object9,
        pub metadatas: Vec<Vec<Either12>>,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct Entity {
        pub name: String,
        pub age: Option<i64>,
        pub profile: Profile,
    }
    pub type Entity36 = Vec<Entity>;
    pub type Entity45 = Vec<Entity>;
}
pub mod stubs {
    use super::*;
    pub trait Add: Sized + 'static {
        fn erased(self) -> ErasedHandler {
            ErasedHandler {
                mat_id: "add".into(),
                mat_title: "add".into(),
                mat_trait: "Add".into(),
                handler_fn: Box::new(move |req, cx| {
                    let req = serde_json::from_str(req)
                        .map_err(|err| HandleErr::InJsonErr(format!("{err}")))?;
                    let res = self
                        .handle(req, cx)
                        .map_err(|err| HandleErr::HandlerErr(format!("{err}")))?;
                    serde_json::to_string(&res)
                        .map_err(|err| HandleErr::HandlerErr(format!("{err}")))
                }),
            }
        }

        fn handle(&self, input: AddArgs, cx: Ctx) -> anyhow::Result<i64>;
    }
    pub trait Range: Sized + 'static {
        fn erased(self) -> ErasedHandler {
            ErasedHandler {
                mat_id: "range".into(),
                mat_title: "range".into(),
                mat_trait: "Range".into(),
                handler_fn: Box::new(move |req, cx| {
                    let req = serde_json::from_str(req)
                        .map_err(|err| HandleErr::InJsonErr(format!("{err}")))?;
                    let res = self
                        .handle(req, cx)
                        .map_err(|err| HandleErr::HandlerErr(format!("{err}")))?;
                    serde_json::to_string(&res)
                        .map_err(|err| HandleErr::HandlerErr(format!("{err}")))
                }),
            }
        }

        fn handle(&self, input: RangeArgs, cx: Ctx) -> anyhow::Result<Vec<i64>>;
    }
    pub trait RecordCreation: Sized + 'static {
        fn erased(self) -> ErasedHandler {
            ErasedHandler {
                mat_id: "record-creation".into(),
                mat_title: "record-creation".into(),
                mat_trait: "RecordCreation".into(),
                handler_fn: Box::new(move |req, cx| {
                    let req = serde_json::from_str(req)
                        .map_err(|err| HandleErr::InJsonErr(format!("{err}")))?;
                    let res = self
                        .handle(req, cx)
                        .map_err(|err| HandleErr::HandlerErr(format!("{err}")))?;
                    serde_json::to_string(&res)
                        .map_err(|err| HandleErr::HandlerErr(format!("{err}")))
                }),
            }
        }

        fn handle(&self, input: Object35, cx: Ctx) -> anyhow::Result<Entity36>;
    }
    pub trait Identity: Sized + 'static {
        fn erased(self) -> ErasedHandler {
            ErasedHandler {
                mat_id: "identity".into(),
                mat_title: "identity".into(),
                mat_trait: "Identity".into(),
                handler_fn: Box::new(move |req, cx| {
                    let req = serde_json::from_str(req)
                        .map_err(|err| HandleErr::InJsonErr(format!("{err}")))?;
                    let res = self
                        .handle(req, cx)
                        .map_err(|err| HandleErr::HandlerErr(format!("{err}")))?;
                    serde_json::to_string(&res)
                        .map_err(|err| HandleErr::HandlerErr(format!("{err}")))
                }),
            }
        }

        fn handle(&self, input: Entity, cx: Ctx) -> anyhow::Result<Entity>;
    }
    pub trait HundredRandom: Sized + 'static {
        fn erased(self) -> ErasedHandler {
            ErasedHandler {
                mat_id: "hundred-random".into(),
                mat_title: "hundred-random".into(),
                mat_trait: "HundredRandom".into(),
                handler_fn: Box::new(move |req, cx| {
                    let req = serde_json::from_str(req)
                        .map_err(|err| HandleErr::InJsonErr(format!("{err}")))?;
                    let res = self
                        .handle(req, cx)
                        .map_err(|err| HandleErr::HandlerErr(format!("{err}")))?;
                    serde_json::to_string(&res)
                        .map_err(|err| HandleErr::HandlerErr(format!("{err}")))
                }),
            }
        }

        fn handle(&self, input: Object35, cx: Ctx) -> anyhow::Result<Entity45>;
    }
    pub fn op_to_trait_name(op_name: &str) -> &'static str {
        match op_name {
            "add" => "Add",
            "hundred-random" => "HundredRandom",
            "identity" => "Identity",
            "range" => "Range",
            "record-creation" => "RecordCreation",
            _ => panic!("unrecognized op_name: {op_name}"),
        }
    }
}
