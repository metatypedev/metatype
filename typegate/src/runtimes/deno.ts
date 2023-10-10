// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { DenoRuntime } from "./deno/deno.ts";
import { registerRuntime } from "./mod.ts";

registerRuntime("deno")(DenoRuntime);
