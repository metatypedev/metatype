// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Engine } from "../src/engine.ts";
import { dirname, fromFileUrl, join, resolve } from "std/path/mod.ts";
import { SystemTypegraph } from "../src/system_typegraphs.ts";
import { PrismaMigrate } from "../src/runtimes/prisma/migration.ts";
import { PrismaRuntime } from "../src/runtimes/prisma/prisma.ts";
import * as PrismaRT from "../src/runtimes/prisma/types.ts";
import { copy } from "std/streams/copy.ts";
import * as native from "native";
import { init_native } from "native";
import { MemoryRegister } from "./utils/memory_register.ts";
import { Q } from "./utils/q.ts";
import { MetaTest } from "./utils/metatest.ts";
import { SingleRegister } from "./utils/single_register.ts";
import { NoLimiter } from "./utils/no_limiter.ts";
import { Typegate } from "../src/typegate/mod.ts";
import { ConnInfo } from "std/http/server.ts";
import { ensure } from "../src/utils.ts";
import { expandGlob } from "std/fs/expand_glob.ts";
import { exists } from "std/fs/mod.ts";
import * as yaml from "std/yaml/mod.ts";
import * as graphql from "graphql";
import { KnownRuntime } from "../src/types/typegraph.ts";
export const testDir = dirname(fromFileUrl(import.meta.url));
export const metaCli = resolve(testDir, "../../target/debug/meta");

init_native();

export interface ShellOptions {
  stdin?: string;
}

let compiled = false;

export async function meta(...args: string[]): Promise<void>;
export async function meta(
  options: ShellOptions,
  ...args: string[]
): Promise<void>;
export async function meta(
  first: string | ShellOptions,
  ...input: string[]
): Promise<void> {
  if (!compiled) {
    await shell(["cargo", "build", "--package", "meta-cli"]);
    compiled = true;
  }

  if (typeof first === "string") {
    console.log(await shell([metaCli, first, ...input]));
  } else {
    console.log(await shell([metaCli, ...input], first));
  }
}

interface SerializeOptions {
  unique?: boolean;
  typegraph?: string;
}

export function serialize(
  tg: string,
  options: SerializeOptions = {},
): Promise<string> {
  const cmd = [metaCli, "serialize", "-f", tg];
  if (options.unique) {
    cmd.push("-1");
  }
  if (options.typegraph) {
    cmd.push("-t", options.typegraph);
  }

  return shell(cmd);
}

export async function shell(
  cmd: string[],
  options: ShellOptions = {},
): Promise<string> {
  console.log("shell", cmd);
  const { stdin = null } = options;
  const p = new Deno.Command(cmd[0], {
    cwd: testDir,
    args: cmd.slice(1),
    stdout: "piped",
    stderr: "piped",
    stdin: "piped",
    env: { RUST_LOG: "info,meta=trace" },
  }).spawn();

  if (stdin != null) {
    const w = p.stdin.getWriter();
    w.write(new TextEncoder().encode(stdin));
    await w.close();
  } else {
    p.stdin.close();
  }

  let out = "";
  for await (const l of p.stdout.pipeThrough(new TextDecoderStream())) {
    out += l;
  }

  await p.stderr.pipeTo(Deno.stderr.writable, { preventClose: true });

  const { code, success } = await p.status;

  if (!success) {
    console.log(out);
    throw new Error(`Command failed with ${code}: ${cmd.join(" ")}`);
  }

  return out;
}

interface TestConfig {
  systemTypegraphs?: boolean;
  introspection?: boolean;
  // port on which the typegate instance will be exposed on expose the typegate instance
  port?: number;
  // create a temporary clean git repo for the tests
  cleanGitRepo?: boolean;
}

interface Test {
  (
    name: string,
    fn: (t: MetaTest) => void | Promise<void>,
    opts?: Omit<Deno.TestDefinition, "name" | "fn"> & TestConfig,
  ): void;
}

interface TestExt extends Test {
  only: Test;
  ignore: Test;
}

export const test = ((name, fn, opts = {}): void => {
  return Deno.test({
    name,
    async fn(t) {
      const typegate = new Typegate(new MemoryRegister(), new NoLimiter());
      const {
        systemTypegraphs = false,
        cleanGitRepo = false,
        introspection = false,
      } = opts;
      if (systemTypegraphs) {
        await SystemTypegraph.loadAll(typegate);
      }

      const mt = new MetaTest(t, typegate, introspection, opts.port ?? null);

      try {
        if (cleanGitRepo) {
          await Deno.remove(join(testDir, ".git"), { recursive: true }).catch(
            () => {},
          );
          await shell(["git", "init"]);
          await shell(["git", "config", "user.name", "user"]);
          await shell(["git", "config", "user.email", "user@example.com"]);
          await shell(["git", "add", "."]);
          await shell(["git", "commit", "-m", "Initial commit"]);
          mt.addCleanup(() =>
            Deno.remove(join(testDir, ".git"), { recursive: true })
          );
        }

        await fn(mt);
      } catch (error) {
        console.error(error);
        throw error;
      } finally {
        await mt.terminate();
      }
    },
    ...opts,
  });
}) as TestExt;

test.only = (name, fn, opts = {}) => test(name, fn, { ...opts, only: true });

test.ignore = (name, fn, opts = {}) =>
  test(name, fn, { ...opts, ignore: true });

export async function findInParents(
  dir: string,
  names: string[],
): Promise<string | null> {
  let current = dir;
  while (true) {
    for (const name of names) {
      const candidate = join(current, name);
      if (await exists(candidate)) {
        return candidate;
      }
    }

    const parent = dirname(current);
    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

export async function runAuto(rootDir: string, target = "dev") {
  for await (
    const pythonFile of expandGlob("**/*.py", {
      root: rootDir,
      globstar: true,
    })
  ) {
    const dir = dirname(pythonFile.path);
    const name = pythonFile.name.replace(".py", "");

    const graphqlFiles: Record<string, string> = {};
    for await (
      const graphqlFile of expandGlob(`**/${name}*.graphql`, {
        root: dir,
        globstar: true,
      })
    ) {
      graphqlFiles[graphqlFile.name] = await Deno.readTextFile(
        graphqlFile.path,
      );
    }

    if (Object.keys(graphqlFiles).length === 0) {
      continue;
    }

    const configFile = await findInParents(dir, [
      "metatype.yml",
      "metatype.yaml",
    ]);

    if (configFile === null) {
      throw new Error(`Cannot find config file for ${name}`);
    }

    const config = yaml.parse(await Deno.readTextFile(configFile)) as any;
    const secrets = config.typegates[target]?.env ?? {};

    test(`Auto-tests for ${name}`, async (t) => {
      const e = await t.pythonFile(pythonFile.path, { secrets });
      await dropSchemas(e);
      await recreateMigrations(e);

      for (const [name, graphqlFile] of Object.entries(graphqlFiles)) {
        await t.should(
          `run case ${name}`,
          async () => {
            const doc = graphql.parse(graphqlFile);
            for (const operation of doc.definitions) {
              const query = graphql.print(operation);
              await new Q(query, {}, {}, {}, [])
                .matchSnapshot(t)
                .on(e);
            }
          },
        );
      }
    });
  }
}

export function gql(query: readonly string[], ...args: any[]) {
  const template = query
    .map((q, i) => `${q}${args[i] ? JSON.stringify(args[i]) : ""}`)
    .join("");
  return new Q(template, {}, {}, {}, []);
}

export async function execute(
  engine: Engine,
  request: Request,
): Promise<Response> {
  const register = new SingleRegister(engine.name, engine);
  const limiter = new NoLimiter();
  const typegate = new Typegate(register, limiter);
  return await typegate.handle(request, {
    remoteAddr: { hostname: "localhost" },
  } as ConnInfo);
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

type PrismaRuntimeDS = KnownRuntime & { name: "prisma" };

export async function dropSchemas(engine: Engine) {
  const runtimes = engine.tg.runtimeReferences.filter((r) =>
    r instanceof PrismaRuntime
  ) as PrismaRuntime[];

  for (const runtime of runtimes) {
    const secret = (engine.tg.tg.runtimes.find((rt) =>
      rt.name === "prisma" && rt.data.name === runtime.name
    ) as PrismaRuntimeDS | undefined)?.data.connection_string_secret;
    ensure(!!secret, `no secret for runtime ${runtime.name}`);

    const connection_string = engine.tg.secretManager.secretOrFail(
      secret as string,
    );
    const schema = new URL(connection_string).searchParams.get("schema");
    ensure(
      !!schema,
      `no schema for connection string ${connection_string![1]}`,
    );

    const res = await runtime.query({
      action: "executeRaw",
      query: {
        arguments: {
          query: `DROP SCHEMA IF EXISTS "${schema}" CASCADE`,
          parameters: "[]",
        },
        selection: {},
      },
    });

    if ("errors" in res) {
      console.error(JSON.stringify(res.errors));
      throw new Error(`cannot drop schema ${schema}`);
    }
  }
}

export async function recreateMigrations(engine: Engine) {
  const runtimes = engine.tg.tg.runtimes.filter(
    (rt) => rt.name === "prisma",
  ) as PrismaRT.DS[];
  const migrationsBaseDir = join(testDir, "prisma-migrations");

  for (const runtime of runtimes) {
    const prisma = new PrismaMigrate(engine, runtime, null);
    const { migrations } = await prisma.create({
      name: "init",
      apply: true,
    } as any);
    const dest = join(migrationsBaseDir, engine.tg.name, runtime.data.name);
    const res = await native.unpack({ dest, migrations });
    if (res !== "Ok") {
      throw new Error(res.Err.message);
    }
  }
}

export async function removeMigrations(engine: Engine) {
  await Deno.remove(join(testDir, "prisma-migrations", engine.rawName), {
    recursive: true,
  }).catch(() => {});
}

export async function copyFile(src: string, dest: string) {
  const srcFile = await Deno.open(join(testDir, src));
  const destPath = join(testDir, dest);
  await Deno.mkdir(dirname(destPath), { recursive: true });
  const destFile = await Deno.create(destPath);

  await copy(srcFile, destFile);

  srcFile.close();
  destFile.close();
}
