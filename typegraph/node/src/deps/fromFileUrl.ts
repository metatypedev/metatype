// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

export default function fromFileUrl(path: string) {
  // Examples: file://C:, file://D:
  const isWin32 = /^file:\/\/\w\:/.test(path);
  return isWin32 ? fromFileUrlWin32(path) : fromFileUrlPosix(path);
}

// https://deno.land/std@0.177.0/path/win32.ts?s=fromFileUrl&source
function fromFileUrlWin32(url: string): string {
  const urlObj = new URL(url);
  let path = decodeURIComponent(
    urlObj.pathname.replace(/\//g, "\\").replace(/%(?![0-9A-Fa-f]{2})/g, "%25"),
  ).replace(/^\\*([A-Za-z]:)(\\|$)/, "$1\\");
  if (urlObj.hostname !== "") {
    // Note: The `URL` implementation guarantees that the drive letter and
    // hostname are mutually exclusive. Otherwise it would not have been valid
    // to append the hostname and path like this.
    path = `\\\\${urlObj.hostname}${path}`;
  }
  return path;
}

// https://deno.land/std@0.177.0/path/posix.ts?s=fromFileUrl&source
function fromFileUrlPosix(url: string): string {
  const urlObject = new URL(url);
  return decodeURIComponent(
    urlObject.pathname.replace(/%(?![0-9A-Fa-f]{2})/g, "%25"),
  );
}
