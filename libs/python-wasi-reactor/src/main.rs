// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// https://stackoverflow.com/a/65980693/3293227
// https://github.com/rust-lang/rust/pull/79997#issuecomment-759856446

#![cfg_attr(feature = "wasm", no_main)]

#[allow(unused_imports)]
use pyo3::prelude::*;

#[allow(unused_imports)]
#[cfg(feature = "wasm")]
use python_wasi_reactor::bindings::*;

use python_wasi_reactor::core::rustpy::*;

#[cfg(feature = "wasm")]
#[no_mangle]
pub extern "C" fn init_python() {
    // println!("[guest] Python init");
    // fs is like s3, only keys, this means
    // ls / → error
    // ls /usr/local/lib → key found, ls
    // however, as read-only, it cannot be listed
    //std::fs::write("hello.txt", "Hi").expect("Unable to write file");
    /*println!("/: {:?}", std::fs::read_dir("/"));
    println!(
        "/usr/local/lib: {:?}",
        std::fs::read_dir("/usr/local/lib/python3.11")
            .unwrap()
            .collect::<Vec<_>>()
    );*/

    std::env::set_var("PYTHONHOME", "/usr/local");
    std::env::set_var("PYTHONPATH", "/app");
    std::env::set_var("PYTHONDONTWRITEBYTECODE", "1");
    pyo3::append_to_inittab!(reactor);
    pyo3::append_to_inittab!(plugin);
    pyo3::prepare_freethreaded_python();
}

#[cfg(not(feature = "wasm"))]
#[allow(unused_imports)]
fn main() {
    pyo3::append_to_inittab!(reactor);
    pyo3::append_to_inittab!(plugin);
    pyo3::prepare_freethreaded_python();
    //py_main(std::env::args().collect());
    println!("native");
}
