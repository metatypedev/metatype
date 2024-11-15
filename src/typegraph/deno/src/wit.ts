// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { MetatypeTypegraphCore } from "./gen/typegraph_core.d.ts";
import type { MetatypeTypegraphRuntimes } from "./gen/typegraph_core.d.ts";
import type { MetatypeTypegraphAws } from "./gen/typegraph_core.d.ts";
import type { MetatypeTypegraphUtils } from "./gen/typegraph_core.d.ts";
import * as js from "./gen/typegraph_core.js";

export const core = js.core as typeof MetatypeTypegraphCore;
export const runtimes = js.runtimes as typeof MetatypeTypegraphRuntimes;
export const aws = js.aws as typeof MetatypeTypegraphAws;
export const wit_utils = js.utils as typeof MetatypeTypegraphUtils;

export type { Cors, Rate } from "./gen/typegraph_core.d.ts";
export type {
  Auth,
  AuthProtocol,
  AuthProtocolBasic,
  AuthProtocolJwt,
  AuthProtocolOauth2,
} from "./gen/typegraph_core.d.ts";
