// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use anyhow::{Context, Result};
use base64::{engine::general_purpose::STANDARD, Engine};
use flate2::{read::GzDecoder, write::GzEncoder, Compression};
use ignore::Walk;
use std::fs;
use std::path::Path;
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

pub fn archive_entries(dir_walker: Walk, suffix: Option<&Path>) -> Result<Option<String>> {
    let encoder = GzEncoder::new(Vec::new(), Compression::default());
    let mut tar = tar::Builder::new(encoder);
    let mut count = 0;
    for result in dir_walker {
        match result {
            Ok(entry) => {
                let path = entry.path();
                if suffix.is_some() && !path.ends_with(suffix.unwrap()) {
                    continue;
                }
                // Note: tar automatically removes the common prefix
                // a/b/c/a.ts, a/b, a/b/d.ts => c/a.ts, .,  d.ts
                if path.is_dir() {
                    tar.append_dir_all(".", path)
                        .context("Adding directory to tarball")?;
                } else {
                    let mut file = fs::File::open(path)
                        .context(format!("failed to open file {}", path.display()))?;
                    tar.append_file(".", &mut file)
                        .context("Adding file to tarball")?;
                }
                count += 1;
                Ok(())
            }
            Err(e) => Err(e),
        }?;
    }

    if count > 0 {
        let bytes = tar.into_inner()?.finish()?;
        return Ok(Some(STANDARD.encode(bytes)));
    }

    Ok(None)
}
