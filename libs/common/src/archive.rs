// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use anyhow::{Context, Result};
use base64::{engine::general_purpose::STANDARD, Engine};
use flate2::{read::GzDecoder, write::GzEncoder, Compression};
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
