// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use std::{env, fs, io};

use crate::wasm::metatype::typegraph::host::Host;

pub struct State;

// FIXME: Replace with wasi2
impl Host for State {
    fn print(&mut self, s: String) {
        println!("{s}");
    }

    fn eprint(&mut self, s: String) {
        eprintln!("{s}");
    }

    fn expand_path(&mut self, _root: String, _exclude: Vec<String>) -> Result<Vec<String>, String> {
        todo!()
    }

    fn path_exists(&mut self, path: String) -> Result<bool, String> {
        match fs::metadata(path) {
            Ok(_) => Ok(true),
            Err(err) if err.kind() == io::ErrorKind::NotFound => Ok(false),
            Err(err) => Err(err.to_string()),
        }
    }

    fn read_file(&mut self, path: String) -> Result<Vec<u8>, String> {
        fs::read(path).map_err(|err| err.to_string())
    }

    fn write_file(&mut self, path: String, data: Vec<u8>) -> Result<(), String> {
        fs::write(path, data).map_err(|err| err.to_string())
    }

    fn get_cwd(&mut self) -> Result<String, String> {
        match env::current_dir() {
            Ok(path) => Ok(path.to_string_lossy().to_string()),
            Err(err) => Err(err.to_string()),
        }
    }
}
