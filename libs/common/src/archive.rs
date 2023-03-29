// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use anyhow::{Context, Result};
use base64::{engine::general_purpose::STANDARD, Engine};
use flate2::{read::GzDecoder, write::GzEncoder, Compression};
use std::fs;
use std::path::Path;
use tar::Archive;

pub fn unpack<P: AsRef<Path>>(dest: P, migrations: Option<String>) -> Result<()> {
    fs::create_dir_all(dest.as_ref())?;
    let Some(migrations) = migrations else {
        return Ok(())
    };
    let bytes = STANDARD.decode(migrations)?;
    let decoder = GzDecoder::new(bytes.as_slice());
    let mut archive = Archive::new(decoder);
    archive.unpack(dest.as_ref())?;
    // eprintln!("Unpacked: {:?}", dest.as_ref());
    // print_dir(dest);
    Ok(())
}

pub fn archive<P: AsRef<Path>>(folder: P) -> Result<String> {
    // eprintln!("Archiving: {:?}", folder.as_ref());
    // print_dir(folder.as_ref());
    let encoder = GzEncoder::new(Vec::new(), Compression::default());
    let mut tar = tar::Builder::new(encoder);
    tar.append_dir_all(".", &folder)
        .context("Adding directory to tarball")?;
    let bytes = tar.into_inner()?.finish()?;
    Ok(STANDARD.encode(bytes))
}

#[allow(dead_code)]
#[cfg(debug_assertions)]
fn print_dir(path: impl AsRef<Path>) {
    for entry in std::fs::read_dir(path.as_ref()).unwrap() {
        let entry = entry.unwrap();
        let file_name = path.as_ref().join(entry.file_name());
        println!("> Entry: {:?}", file_name);
        let file_type = entry.file_type().unwrap();
        if file_type.is_dir() {
            println!("  > directory");
            println!();
            print_dir(file_name);
        } else if file_type.is_file() {
            println!("  > file; content=");
            let content = std::fs::read(file_name).unwrap();
            let content = std::str::from_utf8(&content).unwrap();
            println!("{content}");
            println!();
        }
    }
}
