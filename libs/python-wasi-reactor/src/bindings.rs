// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::core::common::*;
use crate::core::*;
use crate::memory::host_result;
use wasmedge_bindgen_macro::wasmedge_bindgen;

pub mod host {
    #[link(wasm_import_module = "host")]
    extern "C" {
        pub fn callback(id: i32, value: i32);
    }
}

pub fn return_and_host_output(id: Option<i32>, out: Result<String, String>) -> String {
    let ret = match out {
        Ok(res) => {
            if let Some(id) = id {
                let ptr = host_result(true, res.to_owned());
                unsafe {
                    host::callback(id, ptr);
                };
            }
            RetValue {
                value: res,
                tag: Tag::Ok,
            }
        }
        Err(e) => {
            if let Some(id) = id {
                let ptr = host_result(false, e.to_owned());
                unsafe {
                    host::callback(id, ptr);
                };
            }
            RetValue {
                value: e,
                tag: Tag::Err,
            }
        }
    };
    serde_json::to_string(&ret).unwrap()
}

#[wasmedge_bindgen]
pub fn identity(value: String) -> String {
    return_and_host_output(None, Ok(value))
}

#[wasmedge_bindgen]
pub fn register_lambda(name: String, code: String) -> String {
    return_and_host_output(None, lambda::register(name, code))
}

#[wasmedge_bindgen]
pub fn unregister_lambda(name: String) -> String {
    return_and_host_output(None, lambda::unregister(name))
}

#[wasmedge_bindgen]
pub fn apply_lambda(id: i32, name: String, args: String) -> String {
    return_and_host_output(Some(id), lambda::apply(name, args))
}

#[wasmedge_bindgen]
pub fn register_def(name: String, code: String) -> String {
    return_and_host_output(None, defun::register(name, code))
}

#[wasmedge_bindgen]
pub fn unregister_def(name: String) -> String {
    return_and_host_output(None, defun::unregister(name))
}

#[wasmedge_bindgen]
pub fn apply_def(id: i32, name: String, args: String) -> String {
    return_and_host_output(Some(id), defun::apply(name, args))
}

#[wasmedge_bindgen]
pub fn register_module(name: String, code: String) -> String {
    return_and_host_output(None, module::register(name, code))
}

#[wasmedge_bindgen]
pub fn unregister_module(name: String) -> String {
    return_and_host_output(None, module::unregister(name))
}
