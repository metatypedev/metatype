// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { QueryGraph } from "./client.ts";

const port = Deno.env.get("TG_PORT");
const qg = new QueryGraph();
const gql = qg.graphql(`http://localhost:${port}/sample`);

const res1 = await gql.mutation({
  upload: qg.upload({
    file: new File(["hello world"], "hello.txt", { type: "text/plain" }),
    path: "deno/hello.txt",
  }),
});

const res2 = await gql.mutation({
  uploadMany: qg.uploadMany({
    files: [1, 2, 3, 4].map(
      (i) =>
        new File([`hello #${i}`], `hello-${i}.txt`, { type: "text/plain" }),
    ),
    prefix: "deno/",
  }),
});

console.log(JSON.stringify([res1, res2]));
