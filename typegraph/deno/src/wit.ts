// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { MetatypeTypegraphCore } from "./gen/exports/metatype-typegraph-core.d.ts";
import { MetatypeTypegraphRuntimes } from "./gen/exports/metatype-typegraph-runtimes.d.ts";
import { MetatypeTypegraphAws } from "./gen/exports/metatype-typegraph-aws.d.ts";
import { MetatypeTypegraphUtils } from "./gen/exports/metatype-typegraph-utils.d.ts";
import * as js from "./gen/typegraph_core.js";

export const core = js.core as typeof MetatypeTypegraphCore;
export const runtimes = js.runtimes as typeof MetatypeTypegraphRuntimes;
export const aws = js.aws as typeof MetatypeTypegraphAws;
export const wit_utils = js.utils as typeof MetatypeTypegraphUtils;

export type {
  Auth,
  AuthProtocol,
  AuthProtocolBasic,
  AuthProtocolJwt,
  AuthProtocolOauth2,
  Cors,
  Rate,
} from "./gen/exports/metatype-typegraph-core.d.ts";
