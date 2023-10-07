// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { registerRuntime } from "./mod.ts";
import { PythonWasiRuntime } from "./python_wasi/python_wasi.ts";

registerRuntime("python_wasi")(PythonWasiRuntime);
