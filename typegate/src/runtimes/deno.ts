// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Typegate } from "../typegate/mod.ts";
import { DenoRuntime } from "./deno/deno.ts";

Typegate.registerRuntime("deno", DenoRuntime.init);
