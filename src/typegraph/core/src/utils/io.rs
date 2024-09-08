#[cfg(feature = "wasm")]
pub use crate::wit::metatype::typegraph::host::*;

#[cfg(not(feature = "wasm"))]
pub use native::*;

#[cfg(not(feature = "wasm"))]
mod native {
    use regex::Regex;
    use std::{env, fs, io};

    fn match_path(path: &str, patterns: &[Regex]) -> bool {
        patterns.iter().any(|pat| pat.is_match(path))
    }

    fn expand_path_helper(
        path: &str,
        exclude: &[Regex],
        results: &mut Vec<String>,
    ) -> Result<(), io::Error> {
        for entry in fs::read_dir(path)? {
            let path = entry?.path();
            let path_str = path.to_string_lossy();

            if path.is_file() && !match_path(&path_str, exclude) {
                results.push(path_str.to_string());
            } else if path.is_dir() {
                expand_path_helper(&path_str, exclude, results)?;
            }
        }

        Ok(())
    }

    pub fn print(s: &str) {
        println!("{s}");
    }

    pub fn eprint(s: &str) {
        eprintln!("{s}");
    }

    pub fn expand_path(path: &str, exclude: &[String]) -> Result<Vec<String>, String> {
        let mut results = Vec::new();

        let exclude = exclude
            .iter()
            .flat_map(|pat| Regex::new(pat))
            .collect::<Vec<_>>();

        match expand_path_helper(path, &exclude, &mut results) {
            Ok(_) => Ok(results),
            Err(err) => Err(err.to_string()),
        }
    }

    pub fn path_exists(path: &str) -> Result<bool, String> {
        match fs::metadata(path) {
            Ok(_) => Ok(true),
            Err(err) => Err(err.to_string()),
        }
    }

    pub fn read_file(path: &str) -> Result<Vec<u8>, String> {
        fs::read(path).map_err(|err| err.to_string())
    }

    pub fn write_file(path: &str, data: &[u8]) -> Result<(), String> {
        fs::write(path, data).map_err(|err| err.to_string())
    }

    pub fn get_cwd() -> Result<String, String> {
        match env::current_dir() {
            Ok(path) => Ok(path.to_string_lossy().to_string()),
            Err(err) => Err(err.to_string()),
        }
    }
}
