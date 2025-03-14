// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::{Context, Result};
use base64::{engine::general_purpose::STANDARD, Engine};
use flate2::{read::GzDecoder, write::GzEncoder, Compression};
use ignore::{Walk, WalkBuilder};
use indexmap::IndexMap;
use std::{
    collections::BTreeMap,
    fs,
    io::Read,
    path::{Path, PathBuf},
};
use tar::{Archive, Header};

pub fn unpack<P: AsRef<Path>>(dest: P, migrations: Option<impl AsRef<[u8]>>) -> Result<()> {
    fs::create_dir_all(dest.as_ref())?;
    let Some(migrations) = migrations else {
        return Ok(());
    };
    let bytes = STANDARD.decode(migrations)?;
    let decoder = GzDecoder::new(bytes.as_slice());
    let mut archive = Archive::new(decoder);
    archive.unpack(dest.as_ref())?;
    Ok(())
}

pub fn tarb64_unpack_entries_as_map(
    tarb64: Option<impl AsRef<[u8]>>,
) -> Result<IndexMap<PathBuf, Vec<u8>>> {
    let Some(tarb64) = tarb64 else {
        return Ok(IndexMap::new());
    };
    let tar_bytes = STANDARD.decode(tarb64)?;
    let decoder = GzDecoder::new(tar_bytes.as_slice());
    let mut archive = Archive::new(decoder);
    archive
        .entries()?
        .filter_map(|e| match e {
            Ok(entry) => {
                if entry.header().entry_type().is_dir() {
                    None
                } else {
                    Some(entry)
                }
            }
            _ => None,
        })
        .map(|entry| -> Result<(PathBuf, Vec<u8>)> {
            let path = entry.path()?.to_path_buf();
            let bytes = entry.bytes().collect::<Result<Vec<u8>, _>>()?;
            Ok((path, bytes))
        })
        .collect::<Result<IndexMap<PathBuf, Vec<u8>>>>()
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
                    tar.append_file(archive_path, &mut file)?;
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

// we use BTreeMap to ensure deterministic order
pub fn archive_entries_from_bytes(entries: BTreeMap<String, Vec<u8>>) -> Result<Vec<u8>> {
    let encoder = GzEncoder::new(Vec::new(), Compression::default());
    let mut tar = tar::Builder::new(encoder);

    tar.mode(tar::HeaderMode::Deterministic);

    for (path, bytes) in entries.iter() {
        // https://www.gnu.org/software/tar/manual/html_section/Formats.html
        // ustar: filesize < 8GiB, filename <= 255
        // let mut header = Header::new_ustar();

        // gnu: filesize, filename unlimited
        let mut header = Header::new_gnu();

        header.set_size(bytes.len() as u64);
        header.set_entry_type(tar::EntryType::Regular);
        header.set_mode(0o666); // rw-rw-rw
        header.set_cksum();

        tar.append_data(&mut header, path, bytes.as_slice())?;
    }

    let bytes = tar.into_inner()?.finish()?;
    Ok(bytes)
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

// Note: mainly used on the core sdk
// importing the entire base64 lib might increase the binary size
pub fn encode_bytes_to_base_64(bytes: Vec<u8>) -> Result<String> {
    Ok(STANDARD.encode(bytes))
}

pub fn encode_to_base_64(file: &Path) -> Result<String> {
    fs::read(file)
        .with_context(|| format!("reading file {:?}", file.display()))
        .and_then(encode_bytes_to_base_64)
}
