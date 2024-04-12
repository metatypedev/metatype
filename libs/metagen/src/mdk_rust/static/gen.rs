#![allow(unused)]

// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod wit {
    wit_bindgen::generate!({
        //wit-start
        // this bit gets replaced by the inline wit string
        world: "wasi-mat",
        path: "../../mdk/mdk.wit"
        //wit-end
    });
}

use std::cell::RefCell;
use std::collections::HashMap;

use anyhow::Context;

use wit::exports::metatype::mdk::mat::*;

struct Module;

pub struct ErasedHandler {
    mat_id: String,
    mat_title: String,
    handler_fn: Box<dyn Fn(&str, Ctx) -> Res>,
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

    pub fn register_handler(self, handler: ErasedHandler) -> Self {
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
            let mat_trait = op_to_trait_name(&info.op_name);
            if !self.handlers.contains_key(mat_trait) {
                return Err(InitError::UnexpectedMat(info));
            }
        }
        Ok(InitResponse {})
    }

    pub fn handle(&self, req: Req) -> Res {
        let mat_trait = op_to_trait_name(&req.op_name);
        let handler = self.handlers.get(mat_trait).unwrap();
        let cx = Ctx {
            gql: GraphqlClient {},
        };
        (handler.handler_fn)(&req.in_json, cx)
    }
}

pub type InitCallback = fn() -> anyhow::Result<MatBuilder>;

thread_local! {
    pub static MAT_STATE: RefCell<Router> = panic!("MDK_STATE has not been initialized");
}

pub struct Ctx {
    gql: GraphqlClient,
}

pub struct GraphqlClient {}

#[macro_export]
macro_rules! init_mat {
    (hook: $init_hook:expr) => {
        struct MyMat;
        use wit::exports::metatype::mdk::mat::*;
        wit::export!(MyMat with_types_in wit);

        #[allow(unused)]
        impl Guest for MyMat {
            fn handle(req: Req) -> Res {
                MAT_STATE.with(|router| {
                    let router = router.borrow();
                    router.handle(req)
                })
            }

            fn init(args: InitArgs) -> Result<InitResponse, InitError> {
                let router = Router::from_builder($init_hook());
                let resp = router.init(args)?;
                MAT_STATE.set(router);
                Ok(resp)
            }
        }
    };
}
