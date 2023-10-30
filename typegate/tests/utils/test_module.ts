// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dirname, fromFileUrl } from "std/path/mod.ts";
import { shell, ShellOptions, ShellOutput } from "./shell.ts";
import { meta } from "./meta.ts";

export class TestModule {
  currentDir: string;

  constructor(meta: ImportMeta) {
    this.currentDir = dirname(fromFileUrl(meta.url));
  }

  shell(cmd: string[], options: ShellOptions = {}) {
    return shell(cmd, {
      currentDir: this.currentDir,
      ...options,
    });
  }

  async cli(options: ShellOptions, ...args: any[]): Promise<ShellOutput> {
    return await meta({ currentDir: this.currentDir, ...options }, ...args);
  }
}
