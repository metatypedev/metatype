// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use anyhow::{Context, Result};
use base64::{engine::general_purpose::STANDARD, Engine};
use flate2::{read::GzDecoder, write::GzEncoder, Compression};
use ignore::{Walk, WalkBuilder};
use std::{fs, path::Path};
use tar::Archive;

pub fn unpack<P: AsRef<Path>>(dest: P, migrations: Option<impl AsRef<[u8]>>) -> Result<()> {
    fs::create_dir_all(dest.as_ref())?;
    let Some(migrations) = migrations else {
        return Ok(())
    };
    let bytes = STANDARD.decode(migrations)?;
    let decoder = GzDecoder::new(bytes.as_slice());
    let mut archive = Archive::new(decoder);
    archive.unpack(dest.as_ref())?;
    Ok(())
}

pub fn archive<P: AsRef<Path>>(folder: P) -> Result<Option<String>> {
    if !folder.as_ref().try_exists()? {
        return Ok(None);
    }
    let encoder = GzEncoder::new(Vec::new(), Compression::default());
    let mut tar = tar::Builder::new(encoder);
    if folder.as_ref().read_dir()?.next().is_none() {
        Ok(None)
    } else {
        tar.append_dir_all(".", &folder)
            .context("Adding directory to tarball")?;
        let bytes = tar.into_inner()?.finish()?;
        Ok(Some(STANDARD.encode(bytes)))
    }
}

/// Note: empty directories will be excluded
pub fn archive_entries(dir_walker: Walk, prefix: Option<&Path>) -> Result<Option<String>> {
    let encoder = GzEncoder::new(Vec::new(), Compression::default());
    let mut tar = tar::Builder::new(encoder);

    // skip non-relevant fs metadata
    tar.mode(tar::HeaderMode::Deterministic);

    let mut empty = true;
    for result in dir_walker {
        match result {
            Ok(entry) => {
                let path = entry.path();
                if path.is_file() {
                    let mut file = fs::File::open(path)
                        .context(format!("failed to open file {}", path.display()))?;
                    let mut archive_path = path;
                    if let Some(prefix) = prefix {
                        archive_path = match path.strip_prefix(prefix) {
                            Ok(ret) => ret,
                            Err(_) => archive_path,
                        };
                    }
                    // println!("file {} => {}", path.display(), archive_path.display());
                    tar.append_file(archive_path, &mut file)
                        .context("Adding file to tarball")?;
                }
                empty = false;
                Ok(())
            }
            Err(e) => Err(e),
        }?;
    }

    if !empty {
        let bytes = tar.into_inner()?.finish()?;
        return Ok(Some(STANDARD.encode(bytes)));
    }

    Ok(None)
}

pub fn unpack_tar_base64<P: AsRef<Path>>(b64: String, dest: P) -> Result<()> {
    let buffer = STANDARD
        .decode(b64)
        .context("Decoding base64 encoded tarball")?;
    let tar = GzDecoder::new(&buffer[..]);
    let mut archive = Archive::new(tar);
    archive.unpack(dest).context("Unpacking tarball")?;
    Ok(())
}

pub fn flat_list_dir<P: AsRef<Path>>(dir: P) -> Result<Vec<String>> {
    let dir_walker = WalkBuilder::new(&dir)
        .sort_by_file_path(|a, b| a.cmp(b))
        .build();
    let mut ret: Vec<String> = vec![];
    for result in dir_walker {
        match result {
            Ok(entry) => {
                ret.push(entry.path().display().to_string());
                Ok(())
            }
            Err(e) => Err(e),
        }?;
    }
    Ok(ret)
}
