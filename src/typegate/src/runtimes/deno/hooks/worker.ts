// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

self.onmessage = async ({ data }: MessageEvent<{ import: string }>) => {
  try {
    await import(data.import);
    self.postMessage({ success: true });
  } catch (error) {
    self.postMessage({ error });
  }

  self.close();
};
