// no-auto-license-header | @generated (pre-commit doesn't support two headers)
// gen-start
#![allow(unused)]

pub mod wit {
    wit_bindgen::generate!({
        pub_export_macro: true,
        // wit-start
        // this bit gets replaced by the inline wit string
        world: "wit-wire",
        path: "../../../../../wit/wit-wire.wit"
        // wit-end
    });
}

use std::cell::RefCell;
use std::collections::HashMap;

use anyhow::Context;

use wit::exports::metatype::wit_wire::mat_wire::*;

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
        static MT_VERSION: &str = "0.3.7-0";
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
