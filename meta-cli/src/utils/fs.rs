// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use std::path::Path;

#[cfg(target_os = "windows")]
pub fn is_hidden(path: impl AsRef<Path>) -> bool {
    use std::os::windows::fs::MetadataExt;

    // https://learn.microsoft.com/en-us/windows/win32/fileio/file-attribute-constants
    path.as_ref()
        .metadata()
        .map(|m| m.file_attributes() & 0x02 == 0x02)
        .unwrap_or(false)
}

#[cfg(not(target_os = "windows"))]
pub fn is_hidden(path: impl AsRef<Path>) -> bool {
    path.as_ref()
        .file_name()
        .and_then(|n| n.to_str())
        .map_or(false, |n| n.starts_with('.'))
}
