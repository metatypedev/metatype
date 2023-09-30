// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { MetatypeTypegraphCore } from "../gen/interfaces/metatype-typegraph-core.d.ts";
import { MetatypeTypegraphRuntimes } from "../gen/interfaces/metatype-typegraph-runtimes.d.ts";
import { MetatypeTypegraphUtils } from "../gen/interfaces/metatype-typegraph-utils.d.ts";
import * as js from "../gen/typegraph_core.js";

export const core = js.core as typeof MetatypeTypegraphCore;
export const runtimes = js.runtimes as typeof MetatypeTypegraphRuntimes;
export const wit_utils = js.utils as typeof MetatypeTypegraphUtils;

export type {
  Auth,
  AuthProtocol,
  AuthProtocolBasic,
  AuthProtocolJwt,
  AuthProtocolOauth2,
  Cors,
  Rate,
} from "../gen/interfaces/metatype-typegraph-core.d.ts";
