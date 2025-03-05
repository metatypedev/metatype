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
        let qg = query_graph();
        let cx = Ctx {
            host: transports::hostcall(&qg),
            qg,
        };
        (handler.handler_fn)(&req.in_json, cx)
    }
}

pub type InitCallback = fn() -> anyhow::Result<MatBuilder>;

thread_local! {
    pub static MAT_STATE: RefCell<Router> = panic!("MAT_STATE has not been initialized");
}


pub struct Ctx {
    pub qg: QueryGraph,
    pub host: metagen_client::hostcall::HostcallTransport,
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
// gen-static-end
use core::marker::PhantomData;
use metagen_client::prelude::*;

pub mod transports {
    use super::*;

    pub fn graphql(qg: &QueryGraph, addr: Url) -> GraphQlTransportReqwest {
        GraphQlTransportReqwest::new(addr, qg.ty_to_gql_ty_map.clone())
    }
    #[cfg(not(target_family = "wasm"))]
    pub fn graphql_sync(qg: &QueryGraph, addr: Url) -> GraphQlTransportReqwestSync {
        GraphQlTransportReqwestSync::new(addr, qg.ty_to_gql_ty_map.clone())
    }

    pub fn hostcall(qg: &QueryGraph) -> metagen_client::hostcall::HostcallTransport {
        metagen_client::hostcall::HostcallTransport::new(
            std::sync::Arc::new(super::hostcall),
            qg.ty_to_gql_ty_map.clone(),
        )
    }
}

//
// --- --- QueryGraph types --- --- //
//

#[derive(Clone)]
pub struct QueryGraph {
    ty_to_gql_ty_map: TyToGqlTyMap,
}

//
// --- --- Typegraph types --- --- //
//

#[allow(non_snake_case)]
mod node_metas {
    use super::*;
    pub fn scalar() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            sub_nodes: None,
            variants: None,
            input_files: None,
        }
    }    
    pub fn Primitives() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            variants: None,
            sub_nodes: Some(
                [
                    ("str".into(), scalar as NodeMetaFn),
                    ("enum".into(), scalar as NodeMetaFn),
                    ("uuid".into(), scalar as NodeMetaFn),
                    ("email".into(), scalar as NodeMetaFn),
                    ("ean".into(), scalar as NodeMetaFn),
                    ("json".into(), scalar as NodeMetaFn),
                    ("uri".into(), scalar as NodeMetaFn),
                    ("date".into(), scalar as NodeMetaFn),
                    ("datetime".into(), scalar as NodeMetaFn),
                    ("int".into(), scalar as NodeMetaFn),
                    ("float".into(), scalar as NodeMetaFn),
                    ("boolean".into(), scalar as NodeMetaFn),
                ].into()
            ),
            input_files: None,
        }
    }
    pub fn PyPrimitives() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("data".into(), "Primitives".into()),
                ].into()
            ),
            ..Primitives()
        }
    }
    pub fn Branch2() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            variants: None,
            sub_nodes: Some(
                [
                    ("branch2".into(), scalar as NodeMetaFn),
                ].into()
            ),
            input_files: None,
        }
    }
    pub fn CompositesEitherEither() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            sub_nodes: None,
            variants: Some(
                [
                    ("primitives".into(), Primitives as NodeMetaFn),
                    ("branch2".into(), Branch2 as NodeMetaFn),
                ].into()
            ),
            input_files: None,
        }
    }
    pub fn Composites() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            variants: None,
            sub_nodes: Some(
                [
                    ("opt".into(), scalar as NodeMetaFn),
                    ("either".into(), CompositesEitherEither as NodeMetaFn),
                    ("union".into(), scalar as NodeMetaFn),
                    ("list".into(), scalar as NodeMetaFn),
                ].into()
            ),
            input_files: None,
        }
    }
    pub fn PyComposites() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("data".into(), "Composites".into()),
                ].into()
            ),
            ..Composites()
        }
    }
    pub fn Branch33A() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            variants: None,
            sub_nodes: Some(
                [
                    ("phantom3a".into(), scalar as NodeMetaFn),
                    ("to1".into(), Cycles1 as NodeMetaFn),
                ].into()
            ),
            input_files: None,
        }
    }
    pub fn Branch33B() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            variants: None,
            sub_nodes: Some(
                [
                    ("phantom3b".into(), scalar as NodeMetaFn),
                    ("to2".into(), Cycles2 as NodeMetaFn),
                ].into()
            ),
            input_files: None,
        }
    }
    pub fn Cycles3() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            sub_nodes: None,
            variants: Some(
                [
                    ("branch33A".into(), Branch33A as NodeMetaFn),
                    ("branch33B".into(), Branch33B as NodeMetaFn),
                ].into()
            ),
            input_files: None,
        }
    }
    pub fn Cycles2() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            sub_nodes: None,
            variants: Some(
                [
                    ("cycles3".into(), Cycles3 as NodeMetaFn),
                    ("cycles1".into(), Cycles1 as NodeMetaFn),
                ].into()
            ),
            input_files: None,
        }
    }
    pub fn Cycles1() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            variants: None,
            sub_nodes: Some(
                [
                    ("phantom1".into(), scalar as NodeMetaFn),
                    ("to2".into(), Cycles2 as NodeMetaFn),
                    ("list3".into(), Cycles3 as NodeMetaFn),
                ].into()
            ),
            input_files: None,
        }
    }
    pub fn PyCycles() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("data".into(), "Cycles1".into()),
                ].into()
            ),
            ..Cycles1()
        }
    }
    pub fn SimpleCycles3() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            variants: None,
            sub_nodes: Some(
                [
                    ("phantom3".into(), scalar as NodeMetaFn),
                    ("to1".into(), SimpleCycles1 as NodeMetaFn),
                ].into()
            ),
            input_files: None,
        }
    }
    pub fn SimpleCycles2() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            variants: None,
            sub_nodes: Some(
                [
                    ("phantom2".into(), scalar as NodeMetaFn),
                    ("to3".into(), SimpleCycles3 as NodeMetaFn),
                ].into()
            ),
            input_files: None,
        }
    }
    pub fn SimpleCycles1() -> NodeMeta {
        NodeMeta {
            arg_types: None,
            variants: None,
            sub_nodes: Some(
                [
                    ("phantom1".into(), scalar as NodeMetaFn),
                    ("to2".into(), SimpleCycles2 as NodeMetaFn),
                ].into()
            ),
            input_files: None,
        }
    }
    pub fn PySimpleCycles() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("data".into(), "SimpleCycles1".into()),
                ].into()
            ),
            ..SimpleCycles1()
        }
    }
    pub fn TsPrimitives() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("data".into(), "Primitives".into()),
                ].into()
            ),
            ..Primitives()
        }
    }
    pub fn TsComposites() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("data".into(), "Composites".into()),
                ].into()
            ),
            ..Composites()
        }
    }
    pub fn TsCycles() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("data".into(), "Cycles1".into()),
                ].into()
            ),
            ..Cycles1()
        }
    }
    pub fn TsSimpleCycles() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("data".into(), "SimpleCycles1".into()),
                ].into()
            ),
            ..SimpleCycles1()
        }
    }
    pub fn TsProxyPrimitives() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("data".into(), "Primitives".into()),
                ].into()
            ),
            ..Primitives()
        }
    }
    pub fn RsPrimitives() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("data".into(), "Primitives".into()),
                ].into()
            ),
            ..Primitives()
        }
    }
    pub fn RsComposites() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("data".into(), "Composites".into()),
                ].into()
            ),
            ..Composites()
        }
    }
    pub fn RsCycles() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("data".into(), "Cycles1".into()),
                ].into()
            ),
            ..Cycles1()
        }
    }
    pub fn RsSimpleCycles() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("data".into(), "SimpleCycles1".into()),
                ].into()
            ),
            ..SimpleCycles1()
        }
    }
    pub fn RsProxyPrimitives() -> NodeMeta {
        NodeMeta {
            arg_types: Some(
                [
                    ("data".into(), "Primitives".into()),
                ].into()
            ),
            ..Primitives()
        }
    }

}
use types::*;
pub mod types {
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
    #[serde(deny_unknown_fields)]
    pub struct PrimitivesPartial {
        pub str: Option<PrimitivesStrString>,
        #[serde(rename = "enum")]
        pub r#enum: Option<PrimitivesEnumStringEnum>,
        pub uuid: Option<PrimitivesUuidStringUuid>,
        pub email: Option<PrimitivesEmailStringEmail>,
        pub ean: Option<PrimitivesEanStringEan>,
        pub json: Option<PrimitivesJsonStringJson>,
        pub uri: Option<PrimitivesUriStringUri>,
        pub date: Option<PrimitivesDateStringDate>,
        pub datetime: Option<PrimitivesDatetimeStringDatetime>,
        pub int: Option<PrimitivesIntInteger>,
        pub float: Option<PrimitivesFloatFloat>,
        pub boolean: Option<PrimitivesBooleanBoolean>,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(deny_unknown_fields)]
    pub struct PrimitivesArgsPartial {
        pub data: Option<PrimitivesPartial>,
    }
    pub type CompositesOptPrimitivesStrStringOptional = Option<PrimitivesStrString>;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(deny_unknown_fields)]
    pub struct Branch2Partial {
        pub branch2: Option<PrimitivesStrString>,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(untagged)]
    pub enum CompositesEitherEither {
        PrimitivesPartial(PrimitivesPartial),
        Branch2Partial(Branch2Partial),
    }
    pub type CompositesUnionUnionT0StringEnum = String;
    pub type Branch4 = Vec<CompositesUnionUnionT0StringEnum>;
    pub type Branch4again = String;
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
    #[serde(deny_unknown_fields)]
    pub struct CompositesPartial {
        pub opt: CompositesOptPrimitivesStrStringOptional,
        pub either: Option<CompositesEitherEither>,
        pub union: Option<CompositesUnionUnion>,
        pub list: Option<CompositesListPrimitivesStrStringList>,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(deny_unknown_fields)]
    pub struct CompositesArgsPartial {
        pub data: Option<CompositesPartial>,
    }
    pub type Branch33ATo1Cycles1Optional = Option<Cycles1Partial>;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(deny_unknown_fields)]
    pub struct Branch33APartial {
        pub phantom3a: CompositesOptPrimitivesStrStringOptional,
        pub to1: Branch33ATo1Cycles1Optional,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(deny_unknown_fields)]
    pub struct Branch33BPartial {
        pub phantom3b: CompositesOptPrimitivesStrStringOptional,
        pub to2: Cycles1To2Cycles2Optional,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(untagged)]
    pub enum Cycles3 {
        Branch33APartial(Branch33APartial),
        Branch33BPartial(Branch33BPartial),
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(untagged)]
    pub enum Cycles2 {
        Cycles3(Cycles3),
        Cycles1Partial(Cycles1Partial),
    }
    pub type Cycles1To2Cycles2Optional = Option<Box<Cycles2>>;
    pub type Cycles1List3Cycles3List = Vec<Cycles3>;
    pub type Cycles1List3Cycles1List3Cycles3ListOptional = Option<Cycles1List3Cycles3List>;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(deny_unknown_fields)]
    pub struct Cycles1Partial {
        pub phantom1: CompositesOptPrimitivesStrStringOptional,
        pub to2: Box<Cycles1To2Cycles2Optional>,
        pub list3: Cycles1List3Cycles1List3Cycles3ListOptional,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(deny_unknown_fields)]
    pub struct Cycles1ArgsPartial {
        pub data: Option<Cycles1Partial>,
    }
    pub type SimpleCycles3To1SimpleCycles1Optional = Option<SimpleCycles1Partial>;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(deny_unknown_fields)]
    pub struct SimpleCycles3Partial {
        pub phantom3: CompositesOptPrimitivesStrStringOptional,
        pub to1: SimpleCycles3To1SimpleCycles1Optional,
    }
    pub type SimpleCycles2To3SimpleCycles3Optional = Option<SimpleCycles3Partial>;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(deny_unknown_fields)]
    pub struct SimpleCycles2Partial {
        pub phantom2: CompositesOptPrimitivesStrStringOptional,
        pub to3: SimpleCycles2To3SimpleCycles3Optional,
    }
    pub type SimpleCycles1To2SimpleCycles2Optional = Option<SimpleCycles2Partial>;
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(deny_unknown_fields)]
    pub struct SimpleCycles1Partial {
        pub phantom1: CompositesOptPrimitivesStrStringOptional,
        pub to2: Box<SimpleCycles1To2SimpleCycles2Optional>,
    }
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    #[serde(deny_unknown_fields)]
    pub struct SimpleCycles1ArgsPartial {
        pub data: Option<SimpleCycles1Partial>,
    }
}
#[derive(Default, Debug)]
pub struct PrimitivesSelections<ATy = NoAlias> {
    pub str: ScalarSelect<ATy>,
    pub r#enum: ScalarSelect<ATy>,
    pub uuid: ScalarSelect<ATy>,
    pub email: ScalarSelect<ATy>,
    pub ean: ScalarSelect<ATy>,
    pub json: ScalarSelect<ATy>,
    pub uri: ScalarSelect<ATy>,
    pub date: ScalarSelect<ATy>,
    pub datetime: ScalarSelect<ATy>,
    pub int: ScalarSelect<ATy>,
    pub float: ScalarSelect<ATy>,
    pub boolean: ScalarSelect<ATy>,
}
impl_selection_traits!(PrimitivesSelections, str, r#enum, uuid, email, ean, json, uri, date, datetime, int, float, boolean);
#[derive(Default, Debug)]
pub struct Branch2Selections<ATy = NoAlias> {
    pub branch2: ScalarSelect<ATy>,
}
impl_selection_traits!(Branch2Selections, branch2);
#[derive(Default, Debug)]
pub struct CompositesEitherEitherSelections<ATy = NoAlias> {
    pub primitives: CompositeSelect<PrimitivesSelections<ATy>, NoAlias>,
    pub branch2: CompositeSelect<Branch2Selections<ATy>, NoAlias>,
}
impl_union_selection_traits!(CompositesEitherEitherSelections, ("primitives", primitives), ("branch2", branch2));
#[derive(Default, Debug)]
pub struct CompositesUnionUnionSelections<ATy = NoAlias> {
    pub phantom: std::marker::PhantomData<ATy>,
}
impl_union_selection_traits!(CompositesUnionUnionSelections);
#[derive(Default, Debug)]
pub struct CompositesSelections<ATy = NoAlias> {
    pub opt: ScalarSelect<ATy>,
    pub either: CompositeSelect<CompositesEitherEitherSelections<ATy>, ATy>,
    pub union: ScalarSelect<ATy>,
    pub list: ScalarSelect<ATy>,
}
impl_selection_traits!(CompositesSelections, opt, either, union, list);
#[derive(Default, Debug)]
pub struct Branch33ASelections<ATy = NoAlias> {
    pub phantom3a: ScalarSelect<ATy>,
    pub to1: CompositeSelect<Cycles1Selections<ATy>, ATy>,
}
impl_selection_traits!(Branch33ASelections, phantom3a, to1);
#[derive(Default, Debug)]
pub struct Branch33BSelections<ATy = NoAlias> {
    pub phantom3b: ScalarSelect<ATy>,
    pub to2: CompositeSelect<Cycles2Selections<ATy>, ATy>,
}
impl_selection_traits!(Branch33BSelections, phantom3b, to2);
#[derive(Default, Debug)]
pub struct Cycles3Selections<ATy = NoAlias> {
    pub branch33_a: CompositeSelect<Branch33ASelections<ATy>, NoAlias>,
    pub branch33_b: CompositeSelect<Branch33BSelections<ATy>, NoAlias>,
}
impl_union_selection_traits!(Cycles3Selections, ("branch33A", branch33_a), ("branch33B", branch33_b));
#[derive(Default, Debug)]
pub struct Cycles2Selections<ATy = NoAlias> {
    pub cycles3: CompositeSelect<Cycles3Selections<ATy>, NoAlias>,
    pub cycles1: CompositeSelect<Cycles1Selections<ATy>, NoAlias>,
}
impl_union_selection_traits!(Cycles2Selections, ("cycles3", cycles3), ("cycles1", cycles1));
#[derive(Default, Debug)]
pub struct Cycles1Selections<ATy = NoAlias> {
    pub phantom1: ScalarSelect<ATy>,
    pub to2: CompositeSelect<Cycles2Selections<ATy>, ATy>,
    pub list3: CompositeSelect<Cycles3Selections<ATy>, ATy>,
}
impl_selection_traits!(Cycles1Selections, phantom1, to2, list3);
#[derive(Default, Debug)]
pub struct SimpleCycles3Selections<ATy = NoAlias> {
    pub phantom3: ScalarSelect<ATy>,
    pub to1: CompositeSelect<SimpleCycles1Selections<ATy>, ATy>,
}
impl_selection_traits!(SimpleCycles3Selections, phantom3, to1);
#[derive(Default, Debug)]
pub struct SimpleCycles2Selections<ATy = NoAlias> {
    pub phantom2: ScalarSelect<ATy>,
    pub to3: CompositeSelect<SimpleCycles3Selections<ATy>, ATy>,
}
impl_selection_traits!(SimpleCycles2Selections, phantom2, to3);
#[derive(Default, Debug)]
pub struct SimpleCycles1Selections<ATy = NoAlias> {
    pub phantom1: ScalarSelect<ATy>,
    pub to2: CompositeSelect<SimpleCycles2Selections<ATy>, ATy>,
}
impl_selection_traits!(SimpleCycles1Selections, phantom1, to2);

pub fn query_graph() -> QueryGraph {
    QueryGraph {
        ty_to_gql_ty_map: std::sync::Arc::new([
        
            ("Primitives".into(), "primitives!".into()),
            ("Composites".into(), "composites!".into()),
            ("Cycles1".into(), "cycles1!".into()),
            ("SimpleCycles1".into(), "simple_cycles_1!".into()),
            ("primitives".into(), "primitives!".into()),
            ("branch2".into(), "branch2!".into()),
            ("branch33A".into(), "branch33A!".into()),
            ("branch33B".into(), "branch33B!".into()),
            ("cycles3".into(), "cycles3!".into()),
            ("cycles1".into(), "cycles1!".into()),
        ].into()),
    }
}
impl QueryGraph {

    pub fn py_primitives(
        &self,
        args: impl Into<NodeArgs<PrimitivesArgsPartial>>
    ) -> UnselectedNode<PrimitivesSelections, PrimitivesSelections<HasAlias>, QueryMarker, PrimitivesPartial>
    {
        UnselectedNode {
            root_name: "py_primitives".into(),
            root_meta: node_metas::PyPrimitives,
            args: args.into().into(),
            _marker: PhantomData,
        }
    }
    pub fn py_composites(
        &self,
        args: impl Into<NodeArgs<CompositesArgsPartial>>
    ) -> UnselectedNode<CompositesSelections, CompositesSelections<HasAlias>, QueryMarker, CompositesPartial>
    {
        UnselectedNode {
            root_name: "py_composites".into(),
            root_meta: node_metas::PyComposites,
            args: args.into().into(),
            _marker: PhantomData,
        }
    }
    pub fn py_cycles(
        &self,
        args: impl Into<NodeArgs<Cycles1ArgsPartial>>
    ) -> UnselectedNode<Cycles1Selections, Cycles1Selections<HasAlias>, QueryMarker, Cycles1Partial>
    {
        UnselectedNode {
            root_name: "py_cycles".into(),
            root_meta: node_metas::PyCycles,
            args: args.into().into(),
            _marker: PhantomData,
        }
    }
    pub fn py_simple_cycles(
        &self,
        args: impl Into<NodeArgs<SimpleCycles1ArgsPartial>>
    ) -> UnselectedNode<SimpleCycles1Selections, SimpleCycles1Selections<HasAlias>, QueryMarker, SimpleCycles1Partial>
    {
        UnselectedNode {
            root_name: "py_simple_cycles".into(),
            root_meta: node_metas::PySimpleCycles,
            args: args.into().into(),
            _marker: PhantomData,
        }
    }
    pub fn ts_primitives(
        &self,
        args: impl Into<NodeArgs<PrimitivesArgsPartial>>
    ) -> UnselectedNode<PrimitivesSelections, PrimitivesSelections<HasAlias>, QueryMarker, PrimitivesPartial>
    {
        UnselectedNode {
            root_name: "ts_primitives".into(),
            root_meta: node_metas::TsPrimitives,
            args: args.into().into(),
            _marker: PhantomData,
        }
    }
    pub fn ts_composites(
        &self,
        args: impl Into<NodeArgs<CompositesArgsPartial>>
    ) -> UnselectedNode<CompositesSelections, CompositesSelections<HasAlias>, QueryMarker, CompositesPartial>
    {
        UnselectedNode {
            root_name: "ts_composites".into(),
            root_meta: node_metas::TsComposites,
            args: args.into().into(),
            _marker: PhantomData,
        }
    }
    pub fn ts_cycles(
        &self,
        args: impl Into<NodeArgs<Cycles1ArgsPartial>>
    ) -> UnselectedNode<Cycles1Selections, Cycles1Selections<HasAlias>, QueryMarker, Cycles1Partial>
    {
        UnselectedNode {
            root_name: "ts_cycles".into(),
            root_meta: node_metas::TsCycles,
            args: args.into().into(),
            _marker: PhantomData,
        }
    }
    pub fn ts_simple_cycles(
        &self,
        args: impl Into<NodeArgs<SimpleCycles1ArgsPartial>>
    ) -> UnselectedNode<SimpleCycles1Selections, SimpleCycles1Selections<HasAlias>, QueryMarker, SimpleCycles1Partial>
    {
        UnselectedNode {
            root_name: "ts_simple_cycles".into(),
            root_meta: node_metas::TsSimpleCycles,
            args: args.into().into(),
            _marker: PhantomData,
        }
    }
    pub fn ts_proxy_primitives(
        &self,
        args: impl Into<NodeArgs<PrimitivesArgsPartial>>
    ) -> UnselectedNode<PrimitivesSelections, PrimitivesSelections<HasAlias>, QueryMarker, PrimitivesPartial>
    {
        UnselectedNode {
            root_name: "ts_proxy_primitives".into(),
            root_meta: node_metas::TsProxyPrimitives,
            args: args.into().into(),
            _marker: PhantomData,
        }
    }
    pub fn rs_primitives(
        &self,
        args: impl Into<NodeArgs<PrimitivesArgsPartial>>
    ) -> UnselectedNode<PrimitivesSelections, PrimitivesSelections<HasAlias>, QueryMarker, PrimitivesPartial>
    {
        UnselectedNode {
            root_name: "rs_primitives".into(),
            root_meta: node_metas::RsPrimitives,
            args: args.into().into(),
            _marker: PhantomData,
        }
    }
    pub fn rs_composites(
        &self,
        args: impl Into<NodeArgs<CompositesArgsPartial>>
    ) -> UnselectedNode<CompositesSelections, CompositesSelections<HasAlias>, QueryMarker, CompositesPartial>
    {
        UnselectedNode {
            root_name: "rs_composites".into(),
            root_meta: node_metas::RsComposites,
            args: args.into().into(),
            _marker: PhantomData,
        }
    }
    pub fn rs_cycles(
        &self,
        args: impl Into<NodeArgs<Cycles1ArgsPartial>>
    ) -> UnselectedNode<Cycles1Selections, Cycles1Selections<HasAlias>, QueryMarker, Cycles1Partial>
    {
        UnselectedNode {
            root_name: "rs_cycles".into(),
            root_meta: node_metas::RsCycles,
            args: args.into().into(),
            _marker: PhantomData,
        }
    }
    pub fn rs_simple_cycles(
        &self,
        args: impl Into<NodeArgs<SimpleCycles1ArgsPartial>>
    ) -> UnselectedNode<SimpleCycles1Selections, SimpleCycles1Selections<HasAlias>, QueryMarker, SimpleCycles1Partial>
    {
        UnselectedNode {
            root_name: "rs_simple_cycles".into(),
            root_meta: node_metas::RsSimpleCycles,
            args: args.into().into(),
            _marker: PhantomData,
        }
    }
    pub fn rs_proxy_primitives(
        &self,
        args: impl Into<NodeArgs<PrimitivesArgsPartial>>
    ) -> UnselectedNode<PrimitivesSelections, PrimitivesSelections<HasAlias>, QueryMarker, PrimitivesPartial>
    {
        UnselectedNode {
            root_name: "rs_proxy_primitives".into(),
            root_meta: node_metas::RsProxyPrimitives,
            args: args.into().into(),
            _marker: PhantomData,
        }
    }
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

        fn handle(&self, input: PrimitivesArgsPartial, cx: Ctx) -> anyhow::Result<PrimitivesPartial>;
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

        fn handle(&self, input: CompositesArgsPartial, cx: Ctx) -> anyhow::Result<CompositesPartial>;
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

        fn handle(&self, input: Cycles1ArgsPartial, cx: Ctx) -> anyhow::Result<Cycles1Partial>;
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

        fn handle(&self, input: SimpleCycles1ArgsPartial, cx: Ctx) -> anyhow::Result<SimpleCycles1Partial>;
    }
    pub trait RsProxyPrimitives: Sized + 'static {
        fn erased(self) -> ErasedHandler {
            ErasedHandler {
                mat_id: "rs_proxy_primitives".into(),
                mat_title: "rs_proxy_primitives".into(),
                mat_trait: "RsProxyPrimitives".into(),
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

        fn handle(&self, input: PrimitivesArgsPartial, cx: Ctx) -> anyhow::Result<PrimitivesPartial>;
    }
    pub fn op_to_trait_name(op_name: &str) -> &'static str {
        match op_name {
            "composites" => "RsComposites",
            "cycles" => "RsCycles",
            "primitives" => "RsPrimitives",
            "proxy_primitives" => "RsProxyPrimitives",
            "simple_cycles" => "RsSimpleCycles",
            _ => panic!("unrecognized op_name: {op_name}"),
        }
    }
}
