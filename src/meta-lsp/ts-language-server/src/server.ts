// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { LspServer } from "./server/index.ts";

const server = new LspServer(["deno", "lsp"]);
server.start();
