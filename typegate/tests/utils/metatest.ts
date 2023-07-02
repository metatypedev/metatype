// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Server } from "std/http/server.ts";
import { assertSnapshot } from "std/testing/snapshot.ts";
import { Engine } from "../../src/engine.ts";
import { Register } from "../../src/register.ts";
import { typegate } from "../../src/typegate.ts";
import { ConnInfo } from "std/http/server.ts";

import { NoLimiter } from "./no_limiter.ts";
import { SingleRegister } from "./single_register.ts";
import { metaCli, shell } from "../utils.ts";
import { pushTypegraph } from "../../src/runtimes/typegate.ts";

type AssertSnapshotParams = typeof assertSnapshot extends (
  ctx: Deno.TestContext,
  ...rest: infer R
) => Promise<void> ? R
  : never;

export interface ParseOptions {
  deploy?: boolean;
  typegraph?: string;
  // ports on which this typegraph will be exposed
  ports?: number[];
  secrets?: Record<string, string>;
  prefix?: string;
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

type MetaTestCleanupFn = () => void | Promise<void>;

export class MetaTest {
  private cleanups: MetaTestCleanupFn[] = [];

  constructor(
    public t: Deno.TestContext,
    public register: Register,
    port: number | null,
  ) {
    if (port != null) {
      this.cleanups.push(serve(register, port));
    }
  }

  addCleanup(fn: MetaTestCleanupFn) {
    this.cleanups.push(fn);
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
    const { deploy = false, typegraph = null, prefix = null } = opts;
    const cmd = [metaCli, "serialize", "-f", path];
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

    const stdout = await shell(cmd);
    if (stdout.length == 0) {
      throw new Error("No typegraph");
    }

    const [engine, _] = await pushTypegraph(
      stdout,
      opts.secrets ?? {},
      this.register,
    );

    this.cleanups.push(
      ...(opts.ports ?? []).map((port) => exposeOnPort(engine, port)),
    );

    return engine;
  }

  async unregister(engine: Engine) {
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
}
