// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { SystemTypegraph } from "../../src/system_typegraphs.ts";
import { MemoryRegister } from "./memory_register.ts";
import { join } from "std/path/mod.ts";
import { testDir } from "./dir.ts";
import { shell } from "./shell.ts";

import { Server } from "std/http/server.ts";
import { assertSnapshot } from "std/testing/snapshot.ts";
import { assertEquals, assertNotEquals } from "std/assert/mod.ts";
import { QueryEngine } from "../../src/engine/query_engine.ts";
import { Typegate } from "../../src/typegate/mod.ts";

import { NoLimiter } from "./no_limiter.ts";
import { createMetaCli, meta } from "./meta.ts";
import { SecretManager, TypeGraph } from "../../src/typegraph/mod.ts";

type AssertSnapshotParams = typeof assertSnapshot extends (
  ctx: Deno.TestContext,
  ...rest: infer R
) => Promise<void> ? R
  : never;

export interface ParseOptions {
  deploy?: boolean;
  typegraph?: string;
  secrets?: Record<string, string>;
  autoSecretName?: boolean;
  prefix?: string;
  pretty?: boolean;
}

function serve(typegate: Typegate, port: number): () => void {
  const server = new Server({
    port,
    hostname: "localhost",
    handler(req) {
      return typegate.handle(req, {
        remoteAddr: { hostname: "localhost" },
      } as Deno.ServeHandlerInfo);
    },
  });

  const listener = server.listenAndServe();
  return async () => {
    server.close();
    await listener;
  };
}

type MetaTestCleanupFn = () => void | Promise<void>;

export class MetaTest {
  private cleanups: MetaTestCleanupFn[] = [];
  shell = shell;
  cli = createMetaCli(shell);

  constructor(
    public t: Deno.TestContext,
    public typegate: Typegate,
    private introspection: boolean,
    port: number | null,
  ) {
    if (port != null) {
      this.cleanups.push(serve(typegate, port));
    }
  }

  private get register() {
    return this.typegate.register;
  }

  addCleanup(fn: MetaTestCleanupFn) {
    this.cleanups.push(fn);
  }

  getTypegraphEngine(name: string): QueryEngine | undefined {
    return this.register.get(name);
  }

  async serialize(path: string, opts: ParseOptions = {}): Promise<string> {
    const { deploy = false, typegraph = null, prefix = null, pretty = false } =
      opts;
    const cmd = ["serialize", "-f", path];

    if (pretty) {
      cmd.push("--pretty");
    }

    if (prefix != null) {
      cmd.push("--prefix", prefix);
    }

    if (typegraph == null) {
      cmd.push("-1");
    } else {
      cmd.push("--typegraph", typegraph);
    }

    if (deploy) {
      cmd.push("--deploy");
    }

    const { stdout } = await meta(...cmd);
    if (stdout.length == 0) {
      throw new Error("No typegraph");
    }

    return stdout;
  }

  async engine(path: string, opts: ParseOptions = {}): Promise<QueryEngine> {
    const tgString = await this.serialize(path, opts);
    const tgJson = await TypeGraph.parseJson(tgString);

    // for convience, automatically prefix secrets
    const secrets = opts.secrets ?? {};
    if (opts.autoSecretName !== false) {
      const secretPrefx = SecretManager.formatSecretName(
        // name without prefix as secrets are not prefixed
        TypeGraph.formatName(tgJson, false),
        "",
      );
      for (const k of Object.keys(secrets)) {
        secrets[`${secretPrefx}${k}`] = secrets[k];
        delete secrets[k];
      }
    }

    const [engine, _] = await this.typegate.pushTypegraph(
      tgJson,
      secrets,
      this.introspection,
    );

    return engine;
  }

  async unregister(engine: QueryEngine) {
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
    await Promise.all(
      this.register.list().map((e) => e.terminate()),
    );
  }

  async should(
    fact: string,
    fn: (t: Deno.TestContext) => void | Promise<void>,
  ): Promise<boolean> {
    const res = await this.t.step({
      name: `should ${fact}`,
      fn: async (t) => {
        try {
          await fn(t);
        } catch (e) {
          console.error(e);
          throw e;
        }
      },
    });
    if (!res) {
      console.error(`step ${fact} failed unexpectedly`);
    }

    return true;
  }

  async assertSnapshot(...params: AssertSnapshotParams): Promise<void> {
    await assertSnapshot(this.t, ...params);
  }

  async assertThrowsSnapshot(fn: () => void): Promise<void> {
    let err: Error | null = null;
    try {
      fn();
    } catch (e) {
      err = e;
    }

    if (err == null) {
      throw new Error("Assertion failure: function did not throw");
    }
    await this.assertSnapshot(err.message);
  }

  async assertSameTypegraphs(...paths: string[]) {
    assertNotEquals(paths.length, 0);
    const first = paths.shift()!;
    const expected = await this.serialize(first, { pretty: true });
    await this.assertSnapshot(expected);
    for (const path of paths) {
      await this.should(
        `serialize ${path} to the same typegraph as ${first}`,
        async () => {
          const actual = await this.serialize(path, { pretty: true });
          assertEquals(actual, expected);
        },
      );
    }
  }
}

interface TempGitRepo {
  content: Record<string, string>;
}

interface TestConfig {
  systemTypegraphs?: boolean;
  introspection?: boolean;
  // port on which the typegate instance will be exposed on expose the typegate instance
  port?: number;
  // create a temporary clean git repo for the tests
  gitRepo?: TempGitRepo;
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
        gitRepo = null,
        introspection = false,
      } = opts;
      if (systemTypegraphs) {
        await SystemTypegraph.loadAll(typegate);
      }

      const mt = new MetaTest(t, typegate, introspection, opts.port ?? null);
      let dir: string | null = null;

      try {
        if (gitRepo != null) {
          dir = await Deno.makeTempDir();
          const sh = (args: string[]) => shell(args, { currentDir: dir! });
          mt.shell = sh;
          mt.cli = createMetaCli(sh);
          await sh(["git", "init"]);
          await sh(["git", "config", "user.name", "user"]);
          await sh(["git", "config", "user.email", "user@example.com"]);
          await sh(["git", "add", "."]);
          await sh(["git", "commit", "-m", "Initial commit"]);
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
