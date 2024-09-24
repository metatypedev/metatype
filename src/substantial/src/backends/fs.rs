use super::key_value::{Item, KeyValueBackend, KeyValueLike};
use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use std::{
    fs::{self, File},
    io::{Read, Write},
    os::unix::fs::MetadataExt,
    path::{Path, PathBuf},
};

pub struct FileSystemStore {
    root: PathBuf,
}

impl FileSystemStore {
    fn file_path(&self, key: &str) -> PathBuf {
        self.root.join(key)
    }
}

impl KeyValueLike for FileSystemStore {
    fn run_key(&self, run_id: &str, subpath: &str) -> Result<String> {
        Ok(format!("runs/{}/{}", run_id, subpath))
    }

    fn schedule_key(&self, queue: &str, run_id: &str, schedule: &DateTime<Utc>) -> Result<String> {
        Ok(format!(
            "schedules/{}/{}/{}",
            queue,
            schedule.to_rfc3339(),
            run_id
        ))
    }

    fn get(&self, key: &str) -> Result<Option<Item>> {
        let path = self.file_path(key);

        if path.exists() {
            let mut file = File::open(&path)?;
            let mut buffer = Vec::new();
            file.read_to_end(&mut buffer)
                .with_context(|| format!("Reading file {}", path.display()))?;
            let mtime = file.metadata()?.mtime();
            Ok(Some(Item {
                data: buffer,
                mtime: DateTime::from_timestamp(mtime, 0)
                    .with_context(|| format!("Converting file mtime {mtime:?}"))?,
            }))
        } else {
            Ok(None)
        }
    }

    fn put(&self, key: &str, value: Item) -> Result<()> {
        let path = self.file_path(key);

        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .with_context(|| format!("Creating parent folder {}", parent.display()))?;
        }

        let mut file = File::create(&path)?;
        file.write_all(&value.data)
            .with_context(|| format!("Writing file at {}", path.display()))?;

        Ok(())
    }

    fn remove(&self, key: &str) -> Result<()> {
        let path = self.file_path(key);

        if path.exists() {
            fs::remove_file(path)?;
        }

        Ok(())
    }

    fn exists(&self, key: &str) -> Result<bool> {
        let path = self.file_path(key);
        Ok(path.exists())
    }

    fn keys(&self) -> Result<Vec<String>> {
        let mut keys = Vec::new();

        fn collect_keys(dir: &Path, root: &Path, result: &mut Vec<String>) {
            if let Ok(entries) = fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() {
                        if let Ok(relative_path) = path.strip_prefix(root) {
                            result.push(relative_path.to_string_lossy().to_string());
                        }
                    } else if path.is_dir() {
                        collect_keys(&path, root, result);
                    }
                }
            }
        }

        collect_keys(&self.root, &self.root, &mut keys);
        Ok(keys)
    }
}
pub struct FsBackend(KeyValueBackend);

impl FsBackend {
    pub fn new(root: PathBuf) -> Self {
        FsBackend(KeyValueBackend {
            store: Box::new(FileSystemStore { root }),
        })
    }

    pub fn unwrap(self) -> KeyValueBackend {
        self.0
    }
}
