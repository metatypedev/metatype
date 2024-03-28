// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

// gen-static-start
#![allow(unused)]

macro_rules! init_mdk {
    () => {
        #[no_mangle]
        fn init() {
            println!("im in it");
        }
    };
}

macro_rules! mdk_materializer {}

mod wit {
    wit_bindgen::generate!({

        inline: "package metatype:mdk;

interface shared {
  record req {
    op-name: string,
    in-json: string,
  }

  type res = result<string, string>;
}

interface typegate-wasi-host {
  use shared.{req, res};

  hostcall: func(req: req) -> res;
}

interface mat {
  use shared.{req, res};

  handle: func(req: req) -> res;

  record init-args {
  }

  record mat-tag {
    title: string,
    hash: string,
  }

  record init-res {
    metatype-version: string,
    implemented-mats: list<mat-tag>
  }

  init: func(args: init-args) -> init-res;
}

world wasi-mat {
  import typegate-wasi-host;
  export mat;
}
"


    });
}

use wit::exports::metatype::mdk::mat::*;

struct Module;

#[allow(unused)]
impl Guest for Module {
    fn handle(req: Req) -> Res {
        todo!("do routing and rpc")
    }

    fn init(args: InitArgs) -> InitRes {
        todo!("do init")
    }
}

wit::export!(Module with_types_in wit);

pub struct Ctx {
    gql: GraphqlClient,
}

pub struct GraphqlClient {}
// gen-static-end
pub type Float0 = f64;
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Object2 {
    pub a: Option<Float0>,
    pub b: Option<Float0>,
}
pub type Integer3 = i64;
