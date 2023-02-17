// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import "./load_test_env.ts";
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "std/testing/asserts.ts";
import { assertSnapshot } from "std/testing/snapshot.ts";
import { Engine, initTypegraph } from "../src/engine.ts";
import { JSONValue } from "../src/utils.ts";
import { parse } from "std/flags/mod.ts";
import { deepMerge } from "std/collections/deep_merge.ts";
import { dirname, fromFileUrl, join, resolve } from "std/path/mod.ts";
import { Register } from "../src/register.ts";
import { typegate } from "../src/typegate.ts";
import { signJWT } from "../src/crypto.ts";
import { ConnInfo } from "std/http/server.ts";
import { RateLimiter } from "../src/rate_limiter.ts";
import { PrismaRuntimeDS, TypeRuntimeBase } from "../src/type_node.ts";
import { SystemTypegraph } from "../src/system_typegraphs.ts";
import { PrismaMigrate } from "../src/runtimes/prisma_migration.ts";
import { copy } from "std/streams/copy.ts";
import * as native from "native";
import { None } from "monads";

const thisDir = dirname(fromFileUrl(import.meta.url));
const metaCli = resolve(thisDir, "../../target/debug/meta");

export async function meta(...input: string[]): Promise<void> {
  console.log(await shell([metaCli, ...input]));
}

export async function shell(cmd: string[]): Promise<string> {
  const p = Deno.run({
    cwd: thisDir,
    cmd,
    stdout: "piped",
    stderr: "inherit",
  });

  const [status, stdout] = await Promise.all([
    p.status(),
    p.output(),
  ]);
  p.close();

  const out = new TextDecoder().decode(stdout).trim();

  if (!status.success) {
    throw new Error(`Command failed: ${cmd.join(" ")}`);
  }

  return out;
}

export class SingleRegister extends Register {
  constructor(private name: string, private engine: Engine) {
    super();
  }

  set(_payload: string): Promise<string> {
    return Promise.resolve(this.name);
  }

  remove(_name: string): Promise<void> {
    return Promise.resolve();
  }

  list(): Engine[] {
    return [this.engine];
  }

  get(name: string): Engine | undefined {
    return this.has(name) ? this.engine : undefined;
  }

  has(name: string): boolean {
    return name === this.name;
  }
}

export class MemoryRegister extends Register {
  private map = new Map<string, Engine>();

  constructor(private introspection: boolean = false) {
    super();
  }

  async set(payload: string): Promise<string> {
    const engine = await initTypegraph(
      payload,
      SystemTypegraph.getCustomRuntimes(this),
      this.introspection ? undefined : null, // no need to have introspection for tests
    );
    this.map.set(engine.name, engine);
    return engine.name;
  }
  remove(name: string): Promise<void> {
    this.map.delete(name);
    return Promise.resolve();
  }
  list(): Engine[] {
    return Array.from(this.map.values());
  }
  get(name: string): Engine | undefined {
    return this.map.get(name);
  }
  has(name: string): boolean {
    return this.map.has(name);
  }
}

export class NoLimiter extends RateLimiter {
  constructor() {
    super();
  }
  decr(_id: string, n: number): number | null {
    return n;
  }
  currentTokens(
    _id: string,
    _windowSec: number,
    _windowBudget: number,
    _maxLocalHit: number,
  ): Promise<number> {
    return Promise.resolve(1);
  }
}

type AssertSnapshotParams<T> = typeof assertSnapshot extends
  (ctx: Deno.TestContext, ...rest: infer R) => Promise<void> ? R : never;

export class MetaTest {
  constructor(public t: Deno.TestContext, public register: Register) {
  }

  getTypegraph(name: string): Engine | undefined {
    return this.register.get(name);
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

  async pythonFile(path: string): Promise<Engine> {
    return await this.parseTypegraph(
      path,
    );
  }

  async parseTypegraph(
    path: string,
  ): Promise<Engine> {
    const stdout = await shell([metaCli, "serialize", "-f", path, "-1"]);
    if (stdout.length == 0) {
      throw new Error("No typegraph");
    }
    const engineName = await this.register.set(
      stdout,
    );
    return this.register.get(engineName)!;
  }

  async unregister(engine: Engine) {
    const engines = this.register.list().filter((e) => e == engine);
    await Promise.all(
      engines,
    );
    await Promise.all(
      this.register.list().filter((e) => e == engine).map((e) => {
        this.register.remove(e.name);
        return e.terminate();
      }),
    );
  }

  async terminate() {
    await Promise.all(
      this.register.list().map((e) => e.terminate()),
    );
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
      // const reg = opts.customRegister ?? new MemoryRegister();
      const reg = new MemoryRegister(opts.introspection);
      const { systemTypegraphs = false } = opts;
      if (systemTypegraphs) {
        await SystemTypegraph.loadAll(reg);
      }
      const mt = new MetaTest(t, reg);
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

const testConfig = parse(Deno.args);

export function testAll(engineName: string) {
  test(`Auto-tests for ${engineName}`, async (t) => {
    const e = await t.pythonFile(`auto/${engineName}.py`);

    for await (
      const f of Deno.readDir(
        join(thisDir, `auto/queries/${engineName}`),
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

// std/fs/exists will be removed at v157.0
async function exists(path: string): Promise<boolean> {
  const stat = await Deno.stat(path);
  return stat.isFile || stat.isDirectory || stat.isSymlink;
}

type Expect = (res: Response) => Promise<void> | void;
type Variables = Record<string, JSONValue>;
type Context = Record<string, unknown>;

export class Q {
  query: string;
  context: Context;
  variables: Variables;
  headers: Record<string, string>;
  expects: Expect[];

  constructor(
    query: string,
    context: Context,
    variables: Variables,
    headers: Record<string, string>,
    expects: Expect[],
  ) {
    this.query = query;
    this.context = context;
    this.variables = variables;
    this.headers = headers;
    this.expects = expects;
  }

  static async fs(path: string, engine: Engine) {
    const input = join(thisDir, `auto/queries/${path}.graphql`);
    const output = join(thisDir, `auto/queries/${path}.json`);
    const query = Deno.readTextFile(input);
    if (testConfig.override || !(await exists(output))) {
      const { ...result } = await engine!.execute(
        await query,
        None,
        {},
        {},
        null,
      );
      await Deno.writeTextFile(output, JSON.stringify(result, null, 2));
    }
    const result = Deno.readTextFile(output);
    return new Q(await query, {}, {}, {}, [])
      .expectValue(JSON.parse(await result))
      .on(engine);
  }

  withContext(context: Context) {
    return new Q(
      this.query,
      deepMerge(this.context, context),
      this.variables,
      this.headers,
      this.expects,
    );
  }

  withVars(variables: Variables) {
    return new Q(
      this.query,
      this.context,
      deepMerge(this.variables, variables),
      this.headers,
      this.expects,
    );
  }

  withHeaders(headers: Record<string, string>) {
    return new Q(
      this.query,
      this.context,
      this.variables,
      deepMerge(this.headers, headers),
      this.expects,
    );
  }

  expect(expect: Expect) {
    return new Q(this.query, this.context, this.variables, this.headers, [
      ...this.expects,
      expect,
    ]);
  }

  expectStatus(status: number) {
    return this.expect((res) => {
      assertEquals(res.status, status);
    });
  }

  expectBody(expect: (body: any) => Promise<void> | void) {
    return this.expect(async (res) => {
      const json = await res.json();
      await expect(json);
    });
  }

  expectValue(result: JSONValue) {
    return this.expectBody((body) => {
      assertEquals(body, result);
    });
  }

  expectData(data: JSONValue) {
    return this.expectValue({ data });
  }

  expectErrorContains(partial: string) {
    return this.expectBody((body) => {
      assertEquals(
        Array.isArray(body.errors),
        true,
        `no 'errors' field found in body: ${JSON.stringify(body)}`,
      );
      assert(body.errors.length > 0);
      assertStringIncludes(body.errors[0].message, partial);
    });
  }

  async on(engine: Engine) {
    const { query, variables, headers, context, expects } = this;

    const defaults: Record<string, string> = {};

    if (Object.keys(context).length > 0) {
      const jwt = await signJWT(context, 5);
      defaults["Authorization"] = `Bearer ${jwt}`;
    }

    const request = new Request(`http://typegate.local/${engine.name}`, {
      method: "POST",
      body: JSON.stringify(
        {
          query,
          variables,
          operationName: null,
        },
      ),
      headers: {
        ...defaults,
        ...headers,
        "Content-Type": "application/json",
      },
    });
    const response = await execute(engine, request);

    for (const expect of expects) {
      expect(response);
    }
  }
}

export async function execute(
  engine: Engine,
  request: Request,
): Promise<Response> {
  const register = new SingleRegister(engine.name, engine);
  const limiter = new NoLimiter();
  const server = typegate(
    register,
    limiter,
  );
  return await server(
    request,
    { remoteAddr: { hostname: "localhost" } } as ConnInfo,
  );
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function recreateMigrations(engine: Engine) {
  const runtimes = (engine.tg.tg.runtimes as TypeRuntimeBase[]).filter((rt) =>
    rt.name === "prisma"
  ) as PrismaRuntimeDS[];

  const migrationsBaseDir = join(thisDir, "prisma-migrations");

  for await (const runtime of runtimes) {
    const prisma = new PrismaMigrate(engine, runtime, null);
    const { migrations } = await prisma.create(
      { name: "init", apply: true } as any,
    );
    const dest = join(migrationsBaseDir, engine.tg.name, runtime.data.name);
    const res = await native.unpack({ dest, migrations });
    if (res !== "Ok") {
      throw new Error(res.Err.message);
    }
  }
}

export async function removeMigrations(engine: Engine) {
  await Deno.remove(join(thisDir, "prisma-migrations", engine.name), {
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
  const srcFile = await Deno.open(join(thisDir, src));
  const destPath = join(thisDir, dest);
  await Deno.mkdir(dirname(destPath), { recursive: true });
  const destFile = await Deno.create(destPath);

  await copy(srcFile, destFile);

  srcFile.close();
  destFile.close();
}
