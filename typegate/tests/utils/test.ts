// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { SystemTypegraph } from "../../src/system_typegraphs.ts";
import { dirname, extname, join } from "std/path/mod.ts";
import { newTempDir, testDir } from "./dir.ts";
import { shell, ShellOptions } from "./shell.ts";
import { assertSnapshot } from "std/testing/snapshot.ts";
import { assertEquals, assertNotEquals } from "std/assert/mod.ts";
import { QueryEngine } from "../../src/engine/query_engine.ts";
import { Typegate } from "../../src/typegate/mod.ts";
import { createMetaCli } from "./meta.ts";
import { TypeGraph } from "../../src/typegraph/mod.ts";
import { SyncConfig } from "../../src/sync/config.ts";
// until deno supports it...
import { AsyncDisposableStack } from "dispose";
import config from "../../src/config.ts";

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

export enum SDKLangugage {
  Python = "python3",
  TypeScript = "deno",
}

// with a round-robin load balancer emulation
class TypegateManager implements AsyncDisposable {
  private index = 0;

  constructor(private typegates: Typegate[]) {}

  get replicas() {
    return this.typegates.length;
  }

  next() {
    const typegate = this.typegates[this.index];
    this.index = (this.index + 1) % this.typegates.length;
    return typegate;
  }

  async [Symbol.asyncDispose]() {
    await Promise.all(this.typegates.map((tg) => tg[Symbol.asyncDispose]()));
  }
}

interface ServeResult extends AsyncDisposable {
  port: number;
}

function serve(typegates: TypegateManager): Promise<ServeResult> {
  return new Promise((resolve) => {
    const server = Deno.serve({
      port: 0,
      onListen: ({ port }) => {
        resolve({
          port,
          async [Symbol.asyncDispose]() {
            await server.shutdown();
          },
        });
      },
    }, (req) => {
      return typegates.next().handle(req, {
        remoteAddr: { hostname: "localhost" },
      } as Deno.ServeHandlerInfo);
    });
  });
}

type MetaTestCleanupFn = () => void | Promise<void>;

const defaultCli = await createMetaCli(shell);

export class MetaTest {
  shell = shell;
  meta = defaultCli;
  workingDir = testDir;
  currentTypegateIndex = 0;
  #disposed = false;

  static async init(
    t: Deno.TestContext,
    typegates: TypegateManager,
    introspection: boolean,
    tempDir: string,
  ): Promise<MetaTest> {
    await using stack = new AsyncDisposableStack();
    stack.use(typegates);

    const server = await serve(typegates);
    const portNumber = server.port;
    stack.use(server);

    const mt = new MetaTest(
      t,
      typegates,
      introspection,
      portNumber,
      tempDir,
      stack.move(),
    );

    return mt;
  }

  private constructor(
    public t: Deno.TestContext,
    public typegates: TypegateManager,
    private introspection: boolean,
    public port: number,
    public tempDir: string,
    public disposables: AsyncDisposableStack,
  ) {
  }

  async [Symbol.asyncDispose]() {
    if (this.#disposed) return;
    this.#disposed = true;
    await this.disposables[Symbol.asyncDispose]();
  }

  addCleanup(fn: MetaTestCleanupFn) {
    this.disposables.defer(fn);
  }

  get typegate() {
    return this.typegates.next();
  }

  getTypegraphEngine(name: string): QueryEngine | undefined {
    return this.typegates.next().register.get(name);
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
    await this.typegates.next().removeTypegraph(tgName);
  }

  async engine(path: string, opts: ParseOptions = {}): Promise<QueryEngine> {
    const oldTypegraphList = await this.typegates.next().register.list();

    const cmd = ["deploy", "-f", path, "--target", "dev", "--allow-dirty"];

    cmd.push("--gate", `http://localhost:${this.port}`);

    if (opts.prefix != null) {
      cmd.push("--prefix", opts.prefix);
    }

    // if (opts.typegraph != null) {
    //   cmd.push("--typegraph", opts.typegraph);
    // }

    for (const [key, value] of Object.entries(opts.secrets ?? {})) {
      cmd.push("--secret", `${key}=${value}`);
    }

    const { stdout, stderr } = await this.meta(cmd);

    console.log("STDOUT>");
    console.log(stdout);
    console.log("STDERR>");
    console.log(stderr);

    const newTypegraphList = await this.typegates.next().register.list();

    const newTypegraph = newTypegraphList.find((e) =>
      !oldTypegraphList.includes(e)
    );
    // what for redeploy?
    if (newTypegraph == null) {
      throw new Error("No new typegraph");
    }

    if (opts.typegraph != null && opts.typegraph != newTypegraph.name) {
      throw new Error(
        `Expected typegraph ${opts.typegraph}, got ${newTypegraph.name}`,
      );
    }

    return newTypegraph;

    // TODO: MET-500
    // const tgString = await this.serialize(path, opts);
    // const tgJson = await TypeGraph.parseJson(tgString);
    //
    // // for convience, automatically prefix secrets
    // const secrets = opts.secrets ?? {};
    // const { engine, response } = await this.typegates.next().pushTypegraph(
    //   tgJson,
    //   secrets,
    //   this.introspection,
    // );
    //
    // if (engine == null) {
    //   throw response.failure!;
    // }
    //
    // return engine;
  }

  async engineFromDeployed(tgString: string): Promise<QueryEngine> {
    const tg = await TypeGraph.parseJson(tgString);
    const { engine, response } = await this.typegates
      .next()
      .pushTypegraph(tg, {}, this.introspection);

    if (engine == null) {
      throw response.failure!;
    }

    return engine;
  }

  async engineFromTgDeployPython(path: string, cwd: string) {
    const extension = extname(path);
    let sdkLang: SDKLangugage;
    switch (extension) {
      case ".py":
        sdkLang = SDKLangugage.Python;
        break;
      default:
        throw new Error(`Unsupported file type ${extension}`);
    }

    const serialized = await this.#serializeTypegraphFromShell(
      path,
      sdkLang,
      cwd,
    );

    return await this.engineFromDeployed(serialized);
  }

  async #serializeTypegraphFromShell(
    path: string,
    lang: SDKLangugage,
    cwd: string,
  ): Promise<string> {
    // run self deployed typegraph

    const { stderr, stdout } = await this.shell([
      lang.toString(),
      path,
      cwd,
      this.port.toString(),
    ]);

    if (stderr.length > 0) {
      throw new Error(`Error serializing typegraph: ${stderr}`);
    }

    if (stdout.length === 0) {
      throw new Error("No typegraph");
    }

    const tg_json = extractJsonFromStdout(stdout);
    if (!tg_json) {
      throw new Error("No typegraph");
    }

    return tg_json;
  }

  async unregister(engine: QueryEngine) {
    const typegate = this.typegates.next();
    await Promise.all(
      typegate.register
        .list()
        .filter((e) => e == engine)
        .map((e) => {
          typegate.register.remove(e.name);
          return e[Symbol.asyncDispose]();
        }),
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

function extractJsonFromStdout(stdout: string): string | null {
  let jsonStart = null;
  let inJson = false;

  for (const line of stdout.split("\n")) {
    if (inJson) {
      jsonStart += "\n" + line;
    } else if (line.startsWith("{")) {
      jsonStart = line;
      inJson = true;
    }
  }

  return jsonStart;
}

interface TempGitRepo {
  content: Record<string, string>;
}

interface TestConfig {
  introspection?: boolean;
  // number of typegate instances to create
  replicas?: number;
  // create a temporary clean git repo for the tests
  gitRepo?: TempGitRepo;
  syncConfig?: SyncConfig;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

interface Test {
  (
    opts: string | (Omit<Deno.TestDefinition, "fn"> & TestConfig),
    fn: (t: MetaTest) => void | Promise<void>,
  ): void;
}

interface TestExt extends Test {
  only: Test;
  ignore: Test;
}

let currentTest: MetaTest | null = null;
export function getCurrentTest(): MetaTest {
  if (currentTest == null) {
    throw new Error("No current test");
  }
  return currentTest;
}

export const test = ((o, fn): void => {
  const opts = typeof o === "string" ? { name: o } : o;
  return Deno.test({
    async fn(t) {
      if (opts.setup != null) {
        await opts.setup();
      }
      const replicas = opts.replicas ?? 1;
      if (replicas < 1) {
        throw new Error("replicas must be greater than 0");
      }
      if (replicas > 1 && opts.syncConfig == null) {
        throw new Error(
          "syncConfig must be provided when using multiple typegate instances",
        );
      }

      const tempDir = await Deno.makeTempDir({
        prefix: "typegate-test-",
        dir: config.tmp_dir,
      });

      // TODO different tempDir for each typegate instance
      const result = await Promise.allSettled(
        Array.from({ length: replicas }).map((_) =>
          Typegate.init(opts.syncConfig ?? null, null, tempDir)
        ),
      );
      const typegates = result.map((r) => {
        if (r.status === "fulfilled") {
          return r.value;
        } else {
          throw r.reason;
        }
      });

      const {
        gitRepo = null,
        introspection = false,
      } = opts;
      await Promise.all(
        typegates.map((typegate) => SystemTypegraph.loadAll(typegate)),
      );

      await using mt = await MetaTest.init(
        t,
        new TypegateManager(typegates),
        introspection,
        tempDir,
      );

      mt.disposables.defer(async () => {
        await Deno.remove(tempDir, { recursive: true });
      });

      if (opts.teardown != null) {
        mt.disposables.defer(opts.teardown);
      }

      try {
        if (gitRepo != null) {
          const dir = await newTempDir();
          mt.workingDir = dir;

          for (const [path, srcPath] of Object.entries(gitRepo.content)) {
            const destPath = join(dir, path);
            await Deno.mkdir(dirname(destPath), { recursive: true });
            await Deno.copyFile(join(testDir, srcPath), destPath);
          }

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

        currentTest = mt;
        await fn(mt);
        currentTest = null;
      } catch (error) {
        throw error;
      }
    },
    ...opts,
  });
}) as TestExt;

test.only = (o, fn) =>
  test({ ...(typeof o === "string" ? { name: o } : o), only: true }, fn);

test.ignore = (o, fn) =>
  test({ ...(typeof o === "string" ? { name: o } : o), ignore: true }, fn);
