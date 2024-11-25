// skip:start
// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
// skip:end

import { typegraph } from "@typegraph/sdk/index.ts";
import { BasicAuth, tgRemove } from "@typegraph/sdk/tg_deploy.ts";

// Your typegraph
const tg = await typegraph("example", (_g) => {
  // ...
});

// skip:start
const PORT = Deno.args[0];
const baseUrl = `http://localhost:${PORT}`;
const auth = new BasicAuth("admin", "password");
// skip:end

// Response from typegate,
const result = await tgRemove(tg.name, {
  // pass the typegraph name
  typegate: {
    url: baseUrl,
    auth: auth,
  },
});

// skip:next-line
console.log(result.typegate);
