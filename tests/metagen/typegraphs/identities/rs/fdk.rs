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
        static MT_VERSION: &str = "0.5.1-rc.0";
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
    pub struct PrimitivesArgs {
        pub data: Primitives,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct CompositesArgs {
        pub data: Composites,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct Cycles1Args {
        pub data: Cycles1,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct SimpleCycles1Args {
        pub data: SimpleCycles1,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct Primitives {
        pub float: PrimitivesFloatFloat,
        pub boolean: PrimitivesBooleanBoolean,
        pub uri: PrimitivesUriStringUri,
        pub email: PrimitivesEmailStringEmail,
        pub str: PrimitivesStrString,
        pub date: PrimitivesDateStringDate,
        pub uuid: PrimitivesUuidStringUuid,
        pub datetime: PrimitivesDatetimeStringDatetime,
        pub json: PrimitivesJsonStringJson,
        #[serde(rename = "enum")]
        pub r#enum: PrimitivesEnumStringEnum,
        pub ean: PrimitivesEanStringEan,
        pub int: PrimitivesIntInteger,
    }
    pub type PrimitivesStrString = String;
    pub type PrimitivesEnumStringEnum = String;
    pub type PrimitivesUuidStringUuid = String;
    pub type PrimitivesEmailStringEmail = String;
    pub type PrimitivesEanStringEan = String;
    pub type PrimitivesJsonStringJson = String;
    pub type PrimitivesUriStringUri = String;
    pub type PrimitivesDateStringDate = String;
    pub type PrimitivesDatetimeStringDatetime = String;
    pub type PrimitivesIntInteger = i64;
    pub type PrimitivesFloatFloat = f64;
    pub type PrimitivesBooleanBoolean = bool;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct Composites {
        pub list: CompositesListPrimitivesStrStringList,
        pub opt: CompositesOptPrimitivesStrStringOptional,
        pub either: CompositesEitherEither,
        pub union: CompositesUnionUnion,
    }
    pub type CompositesOptPrimitivesStrStringOptional = Option<PrimitivesStrString>;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(untagged)]
    pub enum CompositesEitherEither {
        Primitives(Primitives),
        Branch2(Branch2),
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(untagged)]
    pub enum CompositesUnionUnion {
        Branch4(Branch4),
        PrimitivesIntInteger(PrimitivesIntInteger),
        PrimitivesStrString(PrimitivesStrString),
        Branch4again(Branch4again),
    }
    pub type CompositesListPrimitivesStrStringList = Vec<PrimitivesStrString>;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct Branch2 {
        pub branch2: PrimitivesStrString,
    }
    pub type Branch4 = Vec<CompositesUnionUnionT0StringEnum>;
    pub type Branch4again = String;
    pub type CompositesUnionUnionT0StringEnum = String;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct Cycles1 {
        pub phantom1: CompositesOptPrimitivesStrStringOptional,
        pub to2: Cycles1To2Cycles2Optional,
        pub list3: Cycles1List3Cycles1List3Cycles3ListOptional,
    }
    pub type Cycles1To2Cycles2Optional = Option<Box<Cycles2>>;
    pub type Cycles1List3Cycles1List3Cycles3ListOptional = Option<Box<Cycles1List3Cycles3List>>;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(untagged)]
    pub enum Cycles2 {
        Cycles3(Cycles3),
        Cycles1(Cycles1),
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(untagged)]
    pub enum Cycles3 {
        Branch33A(Branch33A),
        Branch33B(Branch33B),
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct Branch33A {
        pub to1: Branch33ATo1Cycles1Optional,
        pub phantom3a: CompositesOptPrimitivesStrStringOptional,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct Branch33B {
        pub phantom3b: CompositesOptPrimitivesStrStringOptional,
        pub to2: Cycles1To2Cycles2Optional,
    }
    pub type Branch33ATo1Cycles1Optional = Option<Box<Cycles1>>;
    pub type Cycles1List3Cycles3List = Vec<Box<Cycles3>>;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct SimpleCycles1 {
        pub to2: SimpleCycles1To2SimpleCycles2Optional,
        pub phantom1: CompositesOptPrimitivesStrStringOptional,
    }
    pub type SimpleCycles1To2SimpleCycles2Optional = Option<Box<SimpleCycles2>>;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct SimpleCycles2 {
        pub to3: SimpleCycles2To3SimpleCycles3Optional,
        pub phantom2: CompositesOptPrimitivesStrStringOptional,
    }
    pub type SimpleCycles2To3SimpleCycles3Optional = Option<Box<SimpleCycles3>>;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct SimpleCycles3 {
        pub phantom3: CompositesOptPrimitivesStrStringOptional,
        pub to1: SimpleCycles3To1SimpleCycles1Optional,
    }
    pub type SimpleCycles3To1SimpleCycles1Optional = Option<Box<SimpleCycles1>>;
}
pub mod stubs {
    use super::*;
    pub trait RsPrimitives: Sized + 'static {
        fn erased(self) -> ErasedHandler {
            ErasedHandler {
                mat_id: "rs_primitives".into(),
                mat_title: "rs_primitives".into(),
                mat_trait: "RsPrimitives".into(),
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

        fn handle(&self, input: PrimitivesArgs, cx: Ctx) -> anyhow::Result<Primitives>;
    }
    pub trait RsComposites: Sized + 'static {
        fn erased(self) -> ErasedHandler {
            ErasedHandler {
                mat_id: "rs_composites".into(),
                mat_title: "rs_composites".into(),
                mat_trait: "RsComposites".into(),
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

        fn handle(&self, input: CompositesArgs, cx: Ctx) -> anyhow::Result<Composites>;
    }
    pub trait RsCycles: Sized + 'static {
        fn erased(self) -> ErasedHandler {
            ErasedHandler {
                mat_id: "rs_cycles".into(),
                mat_title: "rs_cycles".into(),
                mat_trait: "RsCycles".into(),
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

        fn handle(&self, input: Cycles1Args, cx: Ctx) -> anyhow::Result<Cycles1>;
    }
    pub trait RsSimpleCycles: Sized + 'static {
        fn erased(self) -> ErasedHandler {
            ErasedHandler {
                mat_id: "rs_simple_cycles".into(),
                mat_title: "rs_simple_cycles".into(),
                mat_trait: "RsSimpleCycles".into(),
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

        fn handle(&self, input: SimpleCycles1Args, cx: Ctx) -> anyhow::Result<SimpleCycles1>;
    }
    pub fn op_to_trait_name(op_name: &str) -> &'static str {
        match op_name {
            "composites" => "RsComposites",
            "cycles" => "RsCycles",
            "primitives" => "RsPrimitives",
            "simple_cycles" => "RsSimpleCycles",
            _ => panic!("unrecognized op_name: {op_name}"),
        }
    }
}
