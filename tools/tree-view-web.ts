#!/bin/env -S ghjk deno run -A

// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

/**
 * Usage:
 *   deno run -A dev/tree-view.ts [<options>] <file.py>
 */

import { TypeGraphDS } from "../src/typegate/src/typegraph/mod.ts";
import { projectDir } from "./utils.ts";
import { join, parseArgs } from "./deps.ts";

const dirname = import.meta.dirname ?? new URL(".", import.meta.url).pathname;
const indexHtml = join(dirname, "tree-view/index.html");

const args = parseArgs(Deno.args, {});

const files = args._ as string[];
if (files.length === 0) {
  throw new Error("Path to typegraph definition module is required.");
}
const cmdBase = [
  "cargo",
  "run",
  "--manifest-path",
  `${projectDir}/Cargo.toml`,
  "-p",
  "meta-cli",
  "--",
  "serialize",
  "-f",
];
const tgs: TypeGraphDS[] = [];
for (const file of files) {
  const cmd = [...cmdBase, file];
  const { stdout, code } = await new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    stdout: "piped",
    stderr: "inherit",
  }).output();
  if (code !== 0) {
    console.log(
      `[error] command ${
        cmd.map((c) => JSON.stringify(c)).join(" ")
      } failed with code ${code}`,
    );
    continue;
  }
  tgs.push(...JSON.parse(new TextDecoder().decode(stdout)));
}

if (tgs.length === 0) {
  console.log("[error] no typegraph found");
  Deno.exit(1);
}

Deno.serve({
  port: 0,
  onListen({ port, hostname }) {
    console.log(
      `server running at http://${hostname ?? "localhost"}:${port}`,
    );
  },
}, async (req) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  console.log(`[info] method=${req.method} url=${req.url}`);

  if (req.method !== "GET") {
    console.log(`[error] method '${req.method}' not allowed`);
    return new Response("Method not allowed", { status: 405 });
  }
  if (pathname === "/") {
    return new Response(await Deno.readTextFile(indexHtml), {
      headers: { "content-type": "text/html" },
    });
  }
  // TODO typegraph list and typegraph by name
  if (pathname === "/tg.json") {
    return new Response(JSON.stringify(tgs), {
      headers: { "content-type": "application/json" },
    });
  }
  console.log(`[error] path '${pathname}' not found`);
  return new Response("Not found", { status: 404 });
});
