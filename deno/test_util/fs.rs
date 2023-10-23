// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.

use std::borrow::Cow;
use std::ffi::OsStr;
use std::fs;
use std::path::Path;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Arc;

use anyhow::Context;
use serde::de::DeserializeOwned;
use serde::Serialize;
use url::Url;

use crate::assertions::assert_wildcard_match;

/// Represents a path on the file system, which can be used
/// to perform specific actions.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct PathRef(PathBuf);

impl AsRef<Path> for PathRef {
    fn as_ref(&self) -> &Path {
        self.as_path()
    }
}

impl AsRef<OsStr> for PathRef {
    fn as_ref(&self) -> &OsStr {
        self.as_path().as_ref()
    }
}

impl std::fmt::Display for PathRef {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_path().display())
    }
}

impl PathRef {
    pub fn new(path: impl AsRef<Path>) -> Self {
        Self(path.as_ref().to_path_buf())
    }

    pub fn parent(&self) -> PathRef {
        PathRef(self.as_path().parent().unwrap().to_path_buf())
    }

    pub fn uri_dir(&self) -> Url {
        Url::from_directory_path(self.as_path()).unwrap()
    }

    pub fn uri_file(&self) -> Url {
        Url::from_file_path(self.as_path()).unwrap()
    }

    pub fn as_path(&self) -> &Path {
        self.0.as_path()
    }

    pub fn to_path_buf(&self) -> PathBuf {
        self.0.to_path_buf()
    }

    pub fn to_string_lossy(&self) -> Cow<str> {
        self.0.to_string_lossy()
    }

    pub fn exists(&self) -> bool {
        self.0.exists()
    }

    pub fn try_exists(&self) -> std::io::Result<bool> {
        self.0.try_exists()
    }

    pub fn is_dir(&self) -> bool {
        self.0.is_dir()
    }

    pub fn is_file(&self) -> bool {
        self.0.is_file()
    }

    pub fn join(&self, path: impl AsRef<Path>) -> PathRef {
        PathRef(self.as_path().join(path))
    }

    pub fn with_extension(&self, ext: impl AsRef<OsStr>) -> PathRef {
        PathRef(self.as_path().with_extension(ext))
    }

    pub fn canonicalize(&self) -> PathRef {
        PathRef(strip_unc_prefix(self.as_path().canonicalize().unwrap()))
    }

    pub fn create_dir_all(&self) {
        fs::create_dir_all(self).unwrap();
    }

    pub fn remove_file(&self) {
        fs::remove_file(self).unwrap();
    }

    pub fn remove_dir_all(&self) {
        fs::remove_dir_all(self).unwrap();
    }

    pub fn read_to_string(&self) -> String {
        self.read_to_string_if_exists().unwrap()
    }

    pub fn read_to_string_if_exists(&self) -> Result<String, anyhow::Error> {
        fs::read_to_string(self).with_context(|| format!("Could not read file: {}", self))
    }

    pub fn read_json<TValue: DeserializeOwned>(&self) -> TValue {
        serde_json::from_str(&self.read_to_string()).unwrap()
    }

    pub fn read_json_value(&self) -> serde_json::Value {
        serde_json::from_str(&self.read_to_string()).unwrap()
    }

    pub fn rename(&self, to: impl AsRef<Path>) {
        fs::rename(self, self.join(to)).unwrap();
    }

    pub fn write(&self, text: impl AsRef<str>) {
        fs::write(self, text.as_ref()).unwrap();
    }

    pub fn write_json<TValue: Serialize>(&self, value: &TValue) {
        let text = serde_json::to_string_pretty(value).unwrap();
        self.write(text);
    }

    pub fn symlink_dir(&self, oldpath: impl AsRef<Path>, newpath: impl AsRef<Path>) {
        #[cfg(unix)]
        {
            use std::os::unix::fs::symlink;
            symlink(self.as_path().join(oldpath), self.as_path().join(newpath)).unwrap();
        }
        #[cfg(not(unix))]
        {
            use std::os::windows::fs::symlink_dir;
            symlink_dir(self.as_path().join(oldpath), self.as_path().join(newpath)).unwrap();
        }
    }

    pub fn symlink_file(&self, oldpath: impl AsRef<Path>, newpath: impl AsRef<Path>) {
        #[cfg(unix)]
        {
            use std::os::unix::fs::symlink;
            symlink(self.as_path().join(oldpath), self.as_path().join(newpath)).unwrap();
        }
        #[cfg(not(unix))]
        {
            use std::os::windows::fs::symlink_file;
            symlink_file(self.as_path().join(oldpath), self.as_path().join(newpath)).unwrap();
        }
    }

    pub fn read_dir(&self) -> fs::ReadDir {
        fs::read_dir(self.as_path())
            .with_context(|| format!("Reading {}", self.as_path().display()))
            .unwrap()
    }

    pub fn copy(&self, to: &impl AsRef<Path>) {
        std::fs::copy(self.as_path(), to)
            .with_context(|| format!("Copying {} to {}", self, to.as_ref().display()))
            .unwrap();
    }

    /// Copies this directory to another directory.
    ///
    /// Note: Does not handle symlinks.
    pub fn copy_to_recursive(&self, to: &PathRef) {
        to.create_dir_all();
        let read_dir = self.read_dir();

        for entry in read_dir {
            let entry = entry.unwrap();
            let file_type = entry.file_type().unwrap();
            let new_from = self.join(entry.file_name());
            let new_to = to.join(entry.file_name());

            if file_type.is_dir() {
                new_from.copy_to_recursive(&new_to);
            } else if file_type.is_file() {
                new_from.copy(&new_to);
            }
        }
    }

    pub fn make_dir_readonly(&self) {
        self.create_dir_all();
        if cfg!(windows) {
            Command::new("attrib").arg("+r").arg(self).output().unwrap();
        } else if cfg!(unix) {
            Command::new("chmod").arg("555").arg(self).output().unwrap();
        }
    }

    pub fn assert_matches_file(&self, wildcard_file: impl AsRef<Path>) -> &Self {
        let wildcard_file = PathRef::new(wildcard_file);
        println!("output path {}", wildcard_file);
        let expected_text = wildcard_file.read_to_string();
        self.assert_matches_text(&expected_text)
    }

    pub fn assert_matches_text(&self, wildcard_text: impl AsRef<str>) -> &Self {
        let actual = self.read_to_string();
        assert_wildcard_match(&actual, wildcard_text.as_ref());
        self
    }
}

#[cfg(not(windows))]
#[inline]
fn strip_unc_prefix(path: PathBuf) -> PathBuf {
    path
}

/// Strips the unc prefix (ex. \\?\) from Windows paths.
///
/// Lifted from deno_core for use in the tests.
#[cfg(windows)]
fn strip_unc_prefix(path: PathBuf) -> PathBuf {
    use std::path::Component;
    use std::path::Prefix;

    let mut components = path.components();
    match components.next() {
        Some(Component::Prefix(prefix)) => {
            match prefix.kind() {
                // \\?\device
                Prefix::Verbatim(device) => {
                    let mut path = PathBuf::new();
                    path.push(format!(r"\\{}\", device.to_string_lossy()));
                    path.extend(components.filter(|c| !matches!(c, Component::RootDir)));
                    path
                }
                // \\?\c:\path
                Prefix::VerbatimDisk(_) => {
                    let mut path = PathBuf::new();
                    path.push(prefix.as_os_str().to_string_lossy().replace(r"\\?\", ""));
                    path.extend(components);
                    path
                }
                // \\?\UNC\hostname\share_name\path
                Prefix::VerbatimUNC(hostname, share_name) => {
                    let mut path = PathBuf::new();
                    path.push(format!(
                        r"\\{}\{}\",
                        hostname.to_string_lossy(),
                        share_name.to_string_lossy()
                    ));
                    path.extend(components.filter(|c| !matches!(c, Component::RootDir)));
                    path
                }
                _ => path,
            }
        }
        _ => path,
    }
}

enum TempDirInner {
    TempDir {
        path_ref: PathRef,
        // kept alive for the duration of the temp dir
        _dir: tempfile::TempDir,
    },
    Path(PathRef),
    Symlinked {
        symlink: Arc<TempDirInner>,
        target: Arc<TempDirInner>,
    },
}

impl TempDirInner {
    pub fn path(&self) -> &PathRef {
        match self {
            Self::Path(path_ref) => path_ref,
            Self::TempDir { path_ref, .. } => path_ref,
            Self::Symlinked { symlink, .. } => symlink.path(),
        }
    }

    pub fn target_path(&self) -> &PathRef {
        match self {
            TempDirInner::Symlinked { target, .. } => target.target_path(),
            _ => self.path(),
        }
    }
}

impl Drop for TempDirInner {
    fn drop(&mut self) {
        if let Self::Path(path) = self {
            _ = fs::remove_dir_all(path);
        }
    }
}

/// For creating temporary directories in tests.
///
/// This was done because `tempfiles::TempDir` was very slow on Windows.
///
/// Note: Do not use this in actual code as this does not protect against
/// "insecure temporary file" security vulnerabilities.
#[derive(Clone)]
pub struct TempDir(Arc<TempDirInner>);

impl Default for TempDir {
    fn default() -> Self {
        Self::new()
    }
}

impl TempDir {
    pub fn new() -> Self {
        Self::new_inner(&std::env::temp_dir(), None)
    }

    pub fn new_with_prefix(prefix: &str) -> Self {
        Self::new_inner(&std::env::temp_dir(), Some(prefix))
    }

    pub fn new_in(parent_dir: &Path) -> Self {
        Self::new_inner(parent_dir, None)
    }

    pub fn new_with_path(path: &Path) -> Self {
        Self(Arc::new(TempDirInner::Path(PathRef(path.to_path_buf()))))
    }

    pub fn new_symlinked(target: TempDir) -> Self {
        let target_path = target.path();
        let path = target_path.parent().join(format!(
            "{}_symlinked",
            target_path.as_path().file_name().unwrap().to_str().unwrap()
        ));
        target.symlink_dir(target.path(), &path);
        TempDir(Arc::new(TempDirInner::Symlinked {
            target: target.0,
            symlink: Self::new_with_path(path.as_path()).0,
        }))
    }

    /// Create a new temporary directory with the given prefix as part of its name, if specified.
    fn new_inner(parent_dir: &Path, prefix: Option<&str>) -> Self {
        let mut builder = tempfile::Builder::new();
        builder.prefix(prefix.unwrap_or("deno-cli-test"));
        let dir = builder
            .tempdir_in(parent_dir)
            .expect("Failed to create a temporary directory");
        Self(Arc::new(TempDirInner::TempDir {
            path_ref: PathRef(dir.path().to_path_buf()),
            _dir: dir,
        }))
    }

    pub fn uri(&self) -> Url {
        Url::from_directory_path(self.path()).unwrap()
    }

    pub fn path(&self) -> &PathRef {
        self.0.path()
    }

    /// The resolved final target path if this is a symlink.
    pub fn target_path(&self) -> &PathRef {
        self.0.target_path()
    }

    pub fn create_dir_all(&self, path: impl AsRef<Path>) {
        self.target_path().join(path).create_dir_all()
    }

    pub fn remove_file(&self, path: impl AsRef<Path>) {
        self.target_path().join(path).remove_file()
    }

    pub fn remove_dir_all(&self, path: impl AsRef<Path>) {
        self.target_path().join(path).remove_dir_all()
    }

    pub fn read_to_string(&self, path: impl AsRef<Path>) -> String {
        self.target_path().join(path).read_to_string()
    }

    pub fn rename(&self, from: impl AsRef<Path>, to: impl AsRef<Path>) {
        self.target_path().join(from).rename(to)
    }

    pub fn write(&self, path: impl AsRef<Path>, text: impl AsRef<str>) {
        self.target_path().join(path).write(text)
    }

    pub fn symlink_dir(&self, oldpath: impl AsRef<Path>, newpath: impl AsRef<Path>) {
        self.target_path().symlink_dir(oldpath, newpath)
    }

    pub fn symlink_file(&self, oldpath: impl AsRef<Path>, newpath: impl AsRef<Path>) {
        self.target_path().symlink_file(oldpath, newpath)
    }
}
