// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { SystemTypegraph } from "../../src/system_typegraphs.ts";
import { dirname, join } from "std/path/mod.ts";
import { newTempDir, testDir } from "./dir.ts";
import { shell, ShellOptions } from "./shell.ts";
import { assertSnapshot } from "std/testing/snapshot.ts";
import { assertEquals, assertNotEquals } from "std/assert/mod.ts";
import { QueryEngine } from "../../src/engine/query_engine.ts";
import { Typegate } from "../../src/typegate/mod.ts";
import { createMetaCli } from "./meta.ts";
import { SecretManager, TypeGraph } from "../../src/typegraph/mod.ts";
import { SyncConfig } from "../../src/sync/config.ts";

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

interface ServeResult {
  port: number;
  cleanup: () => Promise<void>;
}

function serve(typegate: Typegate): Promise<ServeResult> {
  return new Promise((resolve) => {
    const server = Deno.serve({
      port: 0,
      onListen: ({ port }) => {
        resolve({
          port,
          cleanup: async () => {
            await server.shutdown();
          },
        });
      },
    }, (req) => {
      return typegate.handle(req, {
        remoteAddr: { hostname: "localhost" },
      } as Deno.ServeHandlerInfo);
    });
  });
}

type MetaTestCleanupFn = () => void | Promise<void>;

const defaultCli = await createMetaCli(shell);

export class MetaTest {
  private cleanups: MetaTestCleanupFn[] = [];
  shell = shell;
  meta = defaultCli;
  workingDir = testDir;
  port: number | null = null;

  static async init(
    t: Deno.TestContext,
    typegate: Typegate,
    introspection: boolean,
    port = false,
  ): Promise<MetaTest> {
    const mt = new MetaTest(t, typegate, introspection);
    if (port) {
      const { port: p, cleanup } = await serve(typegate);
      mt.port = p;
      mt.addCleanup(cleanup);
    }

    return mt;
  }

  private constructor(
    public t: Deno.TestContext,
    public typegate: Typegate,
    private introspection: boolean,
  ) {}

  addCleanup(fn: MetaTestCleanupFn) {
    this.cleanups.push(fn);
  }

  getTypegraphEngine(name: string): QueryEngine | undefined {
    return this.typegate.register.get(name);
  }

  async serialize(path: string, opts: ParseOptions = {}): Promise<string> {
    const {
      deploy = false,
      typegraph = null,
      prefix = null,
      pretty = false,
    } = opts;
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

    const { stdout } = await this.meta(cmd);
    if (stdout.length == 0) {
      throw new Error("No typegraph");
    }

    return stdout;
  }

  async undeploy(tgName: string) {
    await this.typegate.register.remove(tgName);
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

    const { engine, response } = await this.typegate.pushTypegraph(
      tgJson,
      secrets,
      this.introspection,
    );

    if (engine == null) {
      throw response.failure!;
    }

    return engine;
  }

  async engineFromDeployed(tgString: string): Promise<QueryEngine> {
    const tg = await TypeGraph.parseJson(tgString);
    const { engine, response } = await this.typegate.pushTypegraph(
      tg,
      {},
      this.introspection,
    );

    if (engine == null) {
      throw response.failure!;
    }

    return engine;
  }

  async unregister(engine: QueryEngine) {
    await Promise.all(
      this.typegate.register
        .list()
        .filter((e) => e == engine)
        .map((e) => {
          this.typegate.register.remove(e.name);
          return e.terminate();
        }),
    );
  }

  async terminate() {
    await Promise.all(this.cleanups.map((c) => c()));
    await this.typegate.terminate();
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
  port?: boolean;
  // create a temporary clean git repo for the tests
  gitRepo?: TempGitRepo;
  syncConfig?: SyncConfig;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
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
      if (opts.setup != null) {
        await opts.setup();
      }
      // TODO: load balancing for multiple typegate instances
      const typegate = await Typegate.init(opts.syncConfig);
      const {
        systemTypegraphs = false,
        gitRepo = null,
        introspection = false,
      } = opts;
      if (systemTypegraphs) {
        await SystemTypegraph.loadAll(typegate);
      }

      const mt = await MetaTest.init(
        t,
        typegate,
        introspection,
        opts.port != null,
      );

      try {
        if (gitRepo != null) {
          const dir = await newTempDir();
          mt.workingDir = dir;

          for (const [path, srcPath] of Object.entries(gitRepo.content)) {
            const destPath = join(dir, path);
            await Deno.mkdir(dirname(destPath), { recursive: true });
            await Deno.copyFile(join(testDir, srcPath), destPath);
          }
          console.log(dir);

          const sh = (args: string[], options?: ShellOptions) => {
            return shell(args, { currentDir: dir!, ...options });
          };

          mt.shell = sh;
          mt.meta = await createMetaCli(sh);
          await sh(["git", "init"]);
          await sh(["git", "config", "user.name", "user"]);
          await sh(["git", "config", "user.email", "user@example.com"]);
          await sh(["git", "add", "."]);
          await sh(["git", "commit", "-m", "Initial commit"]);
        }

        await fn(mt);
      } catch (error) {
        console.error(error);
        throw error;
      } finally {
        await mt.terminate();
      }

      if (opts.teardown != null) {
        await opts.teardown();
      }
    },
    ...opts,
  });
}) as TestExt;

test.only = (name, fn, opts = {}) => test(name, fn, { ...opts, only: true });

test.ignore = (name, fn, opts = {}) =>
  test(name, fn, { ...opts, ignore: true });
