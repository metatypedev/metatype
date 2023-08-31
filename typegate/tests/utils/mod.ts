// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Engine } from "../../src/engine.ts";
import { dirname, join } from "std/path/mod.ts";
import { copy } from "std/streams/copy.ts";
import { init_native } from "native";
import { SingleRegister } from "./single_register.ts";
import { NoLimiter } from "./no_limiter.ts";
import { Typegate } from "../../src/typegate/mod.ts";
import { RestQuery } from "./query/rest_query.ts";
import { GraphQLQuery } from "./query/graphql_query.ts";
import { test } from "./test.ts";
import { meta } from "./meta.ts";
import { testDir } from "./dir.ts";
import { autoTest } from "./autotest.ts";
import { init_runtimes } from "../../src/runtimes/mod.ts";

// native must load first to avoid import race conditions and panic
init_native();

// same for loading runtimes
await init_runtimes();

export function gql(query: readonly string[], ...args: any[]) {
  const template = query
    .map((q, i) => `${q}${args[i] ? JSON.stringify(args[i]) : ""}`)
    .join("");
  return new GraphQLQuery(template, {}, {}, {}, []);
}

export const rest = {
  get: (path: string) => new RestQuery("GET", path, {}, {}, {}, []),
  post: (path: string) => new RestQuery("POST", path, {}, {}, {}, []),
  put: (path: string) => new RestQuery("PUT", path, {}, {}, {}, []),
  delete: (path: string) => new RestQuery("DELETE", path, {}, {}, {}, []),
};

export const Meta = {
  test,
  autoTest,
  cli: meta,
};

export async function execute(
  engine: Engine,
  request: Request,
): Promise<Response> {
  const register = new SingleRegister(engine.name, engine);
  const limiter = new NoLimiter();
  const typegate = new Typegate(register, limiter);
  return await typegate.handle(request, {
    remoteAddr: { hostname: "localhost" },
  } as Deno.ServeHandlerInfo);
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function copyFile(src: string, dest: string) {
  const srcFile = await Deno.open(join(testDir, src));
  const destPath = join(testDir, dest);
  await Deno.mkdir(dirname(destPath), { recursive: true });
  const destFile = await Deno.create(destPath);

  await copy(srcFile, destFile);

  srcFile.close();
  destFile.close();
}
