use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
struct Example {
    a: u32,
}
/*
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub fn add(a: &JsValue, b: u32) -> u32 {
    let example: Example = a.into_serde().unwrap();
    log("test");
    example.a + b
}
*/

#[no_mangle]
pub fn add(a: u32, b: u32) -> u32 {
    a + b
}
