// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { ExportsMetatypeTypegraphCore } from "../gen/exports/metatype-typegraph-core.d.ts";
import { ExportsMetatypeTypegraphRuntimes } from "../gen/exports/metatype-typegraph-runtimes.d.ts";
import * as js from "../gen/typegraph_core.js";

export const core = js.core as typeof ExportsMetatypeTypegraphCore;
export const runtimes = js.runtimes as typeof ExportsMetatypeTypegraphRuntimes;

export type {
  Auth,
  AuthProtocol,
  AuthProtocolBasic,
  AuthProtocolJwt,
  AuthProtocolOauth2,
  Cors,
  Rate,
} from "../gen/exports/metatype-typegraph-core.d.ts";
