// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// import { SingleRegister } from "test-utils/single_register.ts";
// import { Typegate } from "@metatype/typegate/typegate/mod.ts";
import { QueryEngine } from "@metatype/typegate/engine/query_engine.ts";
import { dirname, join } from "@std/path";
import { copy } from "@std/fs/copy";
import { init_native } from "native";
import { RestQuery } from "./query/rest_query.ts";
import { GraphQLQuery } from "./query/graphql_query.ts";
import { test } from "./test.ts";
import { metaCli } from "./meta.ts";
import { testDir } from "./dir.ts";
import { autoTest } from "./autotest.ts";
import { init_runtimes } from "@metatype/typegate/runtimes/mod.ts";
import { getCurrentTest } from "./test.ts";

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
  cli: metaCli,
};

export async function execute(
  _engine: QueryEngine | null,
  request: Request,
): Promise<Response> {
  // TODO: MET-500
  // This might only work in temp mode; using different temp dir for each typegate instance
  // if (engine) {
  //   const register = new SingleRegister(engine.name, engine);
  //   const test = getCurrentTest();
  //   await using typegate = await Typegate.init(null, register, test.tempDir);
  //   return await typegate.handle(request, {
  //     remoteAddr: { hostname: "localhost" },
  //   } as Deno.ServeHandlerInfo);
  // } else {
  const typegate = getCurrentTest().typegates.next();
  return await typegate.handle(request, {
    hostname: "localhost",
    port: 0,
    transport: "tcp",
  });
  // }
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function copyFile(src: string, dest: string) {
  const destPath = join(testDir, dest);
  await Deno.mkdir(dirname(destPath), { recursive: true });

  await copy(join(testDir, src), destPath);
}
