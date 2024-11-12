// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { registerRuntime } from "./mod.ts";
import { PrismaRuntime } from "./prisma/mod.ts";

registerRuntime("prisma")(PrismaRuntime);
