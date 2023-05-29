// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dirname, fromFileUrl, join } from "std/path/mod.ts";
import { runAuto } from "../utils.ts";

const localDir = dirname(fromFileUrl(import.meta.url));

await runAuto(localDir);

const websiteDir = join(localDir, "../../../website");

await runAuto(websiteDir);
