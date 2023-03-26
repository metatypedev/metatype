// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import "./env.ts";
import { Server } from "std/http/server.ts";
import { assertSnapshot } from "std/testing/snapshot.ts";
import { Engine } from "../src/engine.ts";
import { dirname, fromFileUrl, join, resolve } from "std/path/mod.ts";
import { Register } from "../src/register.ts";
import { typegate } from "../src/typegate.ts";
import { ConnInfo } from "std/http/server.ts";
import { SystemTypegraph } from "../src/system_typegraphs.ts";
import { PrismaMigrate } from "../src/runtimes/prisma_migration.ts";
import { copy } from "std/streams/copy.ts";
import * as native from "native";
import { init_native } from "native";
import { PrismaRuntimeDS } from "../src/runtimes/prisma.ts";
import { NoLimiter } from "./utils/no_limiter.ts";
import { SingleRegister } from "./utils/single_register.ts";
import { MemoryRegister } from "./utils/memory_register.ts";
import { Q } from "./utils/q.ts";

export const testDir = dirname(fromFileUrl(import.meta.url));
const metaCli = resolve(testDir, "../../target/debug/meta");

init_native();

export interface MetaOptions {
  stdin?: string;
}

let compiled = false;

export async function meta(...args: string[]): Promise<void>;
export async function meta(
  options: MetaOptions,
  ...args: string[]
): Promise<void>;
export async function meta(
  first: string | MetaOptions,
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

export async function shell(
  cmd: string[],
  options: MetaOptions = {},
): Promise<string> {
  const p = Deno.run({
    cwd: testDir,
    cmd,
    stdout: "piped",
    stderr: "inherit",
    stdin: "piped",
  });

  const { stdin = null } = options;
  if (stdin != null) {
    await p.stdin.write(new TextEncoder().encode(stdin));
  }
  p.stdin.close();

  const [status, stdout] = await Promise.all([p.status(), p.output()]);
  p.close();

  const out = new TextDecoder().decode(stdout).trim();

  if (!status.success) {
    throw new Error(`Command failed: ${cmd.join(" ")}`);
  }

  return out;
}

type AssertSnapshotParams<T> = typeof assertSnapshot extends (
  ctx: Deno.TestContext,
  ...rest: infer R
) => Promise<void> ? R
  : never;

interface ParseOptions {
  deploy?: boolean;
  typegraph?: string;
  // ports on which this typegraph will be exposed
  ports?: number[];
}

function serve(register: Register, port: number): () => void {
  const handler = async (req: Request) => {
    const server = typegate(register, new NoLimiter());
    return await server(req, {
      remoteAddr: { hostname: "localhost" },
    } as ConnInfo);
  };

  const server = new Server({
    port,
    hostname: "localhost",
    handler,
  });

  const listener = server.listenAndServe();
  return async () => {
    server.close();
    await listener;
  };
}

function exposeOnPort(engine: Engine, port: number): () => void {
  const register = new SingleRegister(engine.name, engine);
  return serve(register, port);
}

export class MetaTest {
  private cleanups: (() => void)[] = [];

  constructor(
    public t: Deno.TestContext,
    public register: Register,
    port: number | null,
  ) {
    if (port != null) {
      this.cleanups.push(serve(register, port));
    }
  }

  getTypegraph(name: string, ports: number[] = []): Engine | undefined {
    const engine = this.register.get(name);
    if (engine != null) {
      this.cleanups.push(...ports.map((port) => exposeOnPort(engine, port)));
    }
    return engine;
  }

  async pythonCode(code: string): Promise<Engine> {
    const path = await Deno.makeTempFile({ suffix: ".py" });
    try {
      await Deno.writeTextFile(path, code);
      return this.pythonFile(path);
    } finally {
      await Deno.remove(path);
    }
  }

  async pythonFile(path: string, opts: ParseOptions = {}): Promise<Engine> {
    return await this.parseTypegraph(path, opts);
  }

  async parseTypegraph(path: string, opts: ParseOptions = {}): Promise<Engine> {
    const { deploy = false, typegraph = null } = opts;
    const cmd = [metaCli, "serialize", "-f", path];

    if (typegraph == null) {
      cmd.push("-1");
    } else {
      cmd.push("--typegraph", typegraph);
    }

    if (deploy) {
      cmd.push("--deploy");
    }

    const stdout = await shell(cmd);
    if (stdout.length == 0) {
      throw new Error("No typegraph");
    }
    const { typegraphName, messages } = await this.register.set(stdout);
    for (const m of messages) {
      console.info(m);
    }
    const engine = this.register.get(typegraphName)!;
    this.cleanups.push(
      ...(opts.ports ?? []).map((port) => exposeOnPort(engine, port)),
    );

    return engine;
  }

  async unregister(engine: Engine) {
    const engines = this.register.list().filter((e) => e == engine);
    await Promise.all(engines);
    await Promise.all(
      this.register
        .list()
        .filter((e) => e == engine)
        .map((e) => {
          this.register.remove(e.name);
          return e.terminate();
        }),
    );
  }

  async terminate() {
    await Promise.all(this.cleanups.map((c) => c()));
    await Promise.all(this.register.list().map((e) => e.terminate()));
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(undefined);
      }, 1000);
    });
  }

  async should(
    fact: string,
    fn: (t: Deno.TestContext) => void | Promise<void>,
  ): Promise<boolean> {
    return await this.t.step({
      name: `should ${fact}`,
      fn,
      //sanitizeOps: false,
    });
  }

  assertSnapshot<T>(...params: AssertSnapshotParams<T>): Promise<void> {
    return assertSnapshot(this.t, ...params);
  }
}

interface TestConfig {
  systemTypegraphs?: boolean;
  introspection?: boolean;
  // port on which the typegate instance will be exposed on expose the typegate instance
  port?: number;
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
      const reg = new MemoryRegister(opts.introspection);
      const { systemTypegraphs = false } = opts;
      if (systemTypegraphs) {
        await SystemTypegraph.loadAll(reg);
      }
      const mt = new MetaTest(t, reg, opts.port ?? null);
      try {
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

export function testAll(engineName: string) {
  test(`Auto-tests for ${engineName}`, async (t) => {
    const e = await t.pythonFile(`auto/${engineName}.py`);

    for await (
      const f of Deno.readDir(
        join(testDir, `auto/queries/${engineName}`),
      )
    ) {
      if (f.name.endsWith(".graphql")) {
        await t.should(
          `run case ${f.name.replace(".graphql", "")}`,
          async () => {
            await Q.fs(`${engineName}/1`, e);
          },
        );
      }
    }
  });
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
  const server = typegate(register, limiter);
  return await server(request, {
    remoteAddr: { hostname: "localhost" },
  } as ConnInfo);
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function recreateMigrations(engine: Engine) {
  const runtimes = engine.tg.tg.runtimes.filter(
    (rt) => rt.name === "prisma",
  ) as unknown[] as PrismaRuntimeDS[];

  const migrationsBaseDir = join(testDir, "prisma-migrations");

  for await (const runtime of runtimes) {
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
  await Deno.remove(join(testDir, "prisma-migrations", engine.name), {
    recursive: true,
  }).catch(() => {});
}

export function displayMetrics(msg?: string) {
  console.log("METRICS", msg ? `-- ${msg}` : "");
  const { ops, ...metrics } = Deno.metrics();
  console.table(metrics);
  // console.log(Object.keys(ops));
  for (const [key, val] of Object.entries(ops)) {
    if (val.opsDispatched != val.opsCompleted) {
      console.log(key);
      console.table(val);
    }
  }
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
