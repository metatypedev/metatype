#![allow(unused)]

mod wit {
    wit_bindgen::generate!({
        //wit-start
        // this bit gets replaced by the inline wit string
        world: "wasi-mat",
        path: "../../mdk/mdk.wit"
        //wit-end
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
