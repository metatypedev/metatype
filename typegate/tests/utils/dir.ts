// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dirname, fromFileUrl } from "std/path/mod.ts";

export const testDir = dirname(dirname(fromFileUrl(import.meta.url)));
