// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { toFileUrl } from "@std/path/to-file-url";

self.onmessage = async ({ data }: MessageEvent<{ import: string }>) => {
  try {
    await import(toFileUrl(data.import).toString());
    self.postMessage({ success: true });
  } catch (error) {
    self.postMessage({ error });
  }

  self.close();
};


