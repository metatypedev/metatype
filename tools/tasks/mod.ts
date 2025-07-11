// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { DenoTaskDefArgs } from "@ghjk/ts";

import tasksBuild from "./build.ts";
import tasksDev from "./dev.ts";
import tasksFetch from "./fetch.ts";
import tasksGen from "./gen.ts";
import tasksInstall from "./install.ts";
import tasksLint from "./lint.ts";
import tasksLock from "./lock.ts";
import tasksTest from "./test.ts";

export default {
  ...tasksBuild,
  ...tasksDev,
  ...tasksFetch,
  ...tasksGen,
  ...tasksInstall,
  ...tasksLint,
  ...tasksLock,
  ...tasksTest,
} satisfies Record<string, DenoTaskDefArgs>;
