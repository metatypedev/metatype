// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dirname, fromFileUrl, join } from "std/path/mod.ts";
import { autoTest } from "../utils/autotest.ts";

const localDir = dirname(fromFileUrl(import.meta.url));

await autoTest(localDir);

const websiteDir = join(localDir, "../../../website");

await autoTest(websiteDir);
