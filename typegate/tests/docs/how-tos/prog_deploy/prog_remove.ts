// skip:start
// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0
// skip:end

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

// Response from typegate
const result = await tgRemove(tg, {
  typegate: {
    url: baseUrl,
    auth: auth,
  },
});

// skip:next-line
console.log(result.typegate);
