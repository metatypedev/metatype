// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Typegate } from "../typegate/mod.ts";
import { PrismaRuntime } from "./prisma/mod.ts";

Typegate.registerRuntime("prisma", PrismaRuntime.init);
