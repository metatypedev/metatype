// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { typegraph } from "@typegraph/sdk/index.js";

import { BasicAuth, tgRemove } from "@typegraph/sdk/tg_deploy.js";

// Your typegraph
const tg = await typegraph("example", (_g) => {
  // ...
});

// skip:start
const PORT = Deno.args[0];
const baseUrl = `http://localhost:${PORT}`;
const auth = new BasicAuth("admin", "password");
// skip:end

const result = await tgRemove(tg, {
  typegate: {
    url: baseUrl,
    auth: auth,
  },
});

// Response from typegate
console.log(result.typegate);
