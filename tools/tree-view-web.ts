#!/bin/env -S ghjk deno run -A

// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

/**
 * Usage:
 *   deno run -A tools/tree-view-web.ts [<options>] <file.py>
 */

import { Application, Router, Status } from "jsr:@oak/oak";
import { TypeGraphDS } from "../src/typegate/src/typegraph/mod.ts";
import { projectDir } from "./utils.ts";
import { parseArgs } from "./deps.ts";

const args = parseArgs(Deno.args, {
  string: ["port"],
  boolean: ["json"],
});

const argsPort = parseInt(args.port ?? "");
const envPort = parseInt(Deno.env.get("PORT") ?? "");
const port = isNaN(argsPort) ? (isNaN(envPort) ? 0 : envPort) : argsPort;

const files = args._ as string[];
if (files.length === 0) {
  throw new Error("Path to typegraph definition module is required.");
}

const tgs: TypeGraphDS[] = [];

if (args.json) {
  for (const file of files) {
    const raw = await Deno.readFile(file);
    const str = new TextDecoder().decode(raw);
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) {
      tgs.push(...parsed);
    } else {
      tgs.push(parsed);
    }
  }
} else {
  const cmdBase = [
    "cargo",
    "run",
    "--manifest-path",
    `${projectDir}/Cargo.toml`,
    "-p",
    "meta-cli",
    "--",
    "serialize",
    "-vvv",
    "-f",
  ];

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
}

if (tgs.length === 0) {
  console.log("[error] no typegraph found");
  Deno.exit(1);
}

const byName: Map<string, TypeGraphDS> = new Map();

for (const tg of tgs) {
  const name = tg.types[0].title;
  if (byName.has(name)) {
    console.log(
      `[warn] Duplicate typegraph name '${name}'. The older one will be dropped`,
    );
  }
  byName.set(tg.types[0].title, tg);
}

const router = new Router();

const fsCache: Map<string, Uint8Array> = new Map();

async function getDistFile(path: string) {
  const cached = fsCache.get(path);
  if (cached != null) {
    return cached;
  }
  const value = await Deno.readFile(
    `${projectDir}/tools/tree/dist/${path}`,
  );
  fsCache.set(path, value);
  return value;
}

router.get("/logo.svg", async (ctx) => {
  ctx.response.body = await getDistFile("logo.svg");
  ctx.response.type = "svg";
});

router.get("/assets/:asset", async (ctx) => {
  const asset = ctx.params.asset;
  if (asset.includes("..") || asset.includes("/")) {
    ctx.response.body = `invalid assset name '${asset}'`;
    ctx.response.status = Status.BadRequest;
  } else {
    ctx.response.body = await getDistFile(`assets/${ctx.params.asset}`);
    ctx.response.type = ctx.params.asset.split(".").slice(-1)[0];
  }
});

router.get("/api/typegraphs", (ctx) => {
  ctx.response.body = [...byName.keys()];
  ctx.response.type = "json";
});

router.get("/api/typegraphs/:tgName", (ctx) => {
  const tg = byName.get(ctx.params.tgName);
  if (tg == null) {
    ctx.response.body = `typegraph "${ctx.params.tgName}" not found`;
    ctx.response.status = Status.NotFound;
  } else {
    ctx.response.body = {
      stats: {
        types: tg.types.length,
        runtimes: tg.runtimes.length,
        materializers: tg.materializers.length,
        policies: tg.policies.length,
      },
    };
    ctx.response.type = "json";
  }
});

router.get("/api/typegraphs/:tgName/types/:typeIdx", (ctx) => {
  const tg = byName.get(ctx.params.tgName);
  if (tg == null) {
    ctx.response.body = `typegraph "${ctx.params.tgName}" not found`;
    ctx.response.status = Status.NotFound;
  } else {
    const typeIdx = +ctx.params.typeIdx;
    if (Number.isNaN(typeIdx)) {
      ctx.response.body = `invalid type index "${ctx.params.typeIdx}"`;
      ctx.response.status = Status.BadRequest;
      return;
    }
    const typeNode = tg.types[typeIdx];
    if (typeNode == null) {
      ctx.response.body = `type index out of bounds #${typeIdx}`;
      ctx.response.status = Status.NotFound;
    } else {
      ctx.response.body = tg.types[+ctx.params.typeIdx];
      ctx.response.type = "json";
    }
  }
});

const app = new Application();

app.use(async (ctx, next) => {
  await next();
  console.log(
    `- ${ctx.request.method} ${ctx.response.status} - ${ctx.request.url.pathname}${ctx.request.url.search}`,
  );
});

app.use(async (ctx, next) => {
  const pathname = ctx.request.url.pathname;
  if (
    pathname.startsWith("/api") ||
    pathname == "/logo.svg" ||
    pathname.startsWith("/assets")
  ) {
    await next();
  } else {
    ctx.response.body = await getDistFile("index.html");
    ctx.response.type = "html";
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

app.addEventListener("listen", (evt) => {
  console.log(`[info] server running at http://${evt.hostname}:${evt.port}`);
});

app.listen({ port });
