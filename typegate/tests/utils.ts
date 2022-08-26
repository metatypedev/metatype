import {
  assert,
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "std/testing/asserts.ts";
import { Engine, initTypegraph } from "../src/engine.ts";
import { JSONValue } from "../src/utils.ts";
import { parse } from "std/flags/mod.ts";
import { exists } from "std/fs/mod.ts";
import { RuntimesConfig } from "../src/runtimes/Runtime.ts";
import { deepMerge } from "std/collections/mod.ts";

const testRuntimesConfig = {
  worker: { lazy: false },
};

export async function shell(cmd: string[]): Promise<string> {
  const p = Deno.run({
    cmd,
    stdout: "piped",
    stderr: "piped",
  });

  const output = await p.output();
  const stdout = new TextDecoder().decode(output).trim();
  const error = await p.stderrOutput();
  const stderr = new TextDecoder().decode(error).trim();
  p.close();

  if (stderr.length > 0) {
    throw new Error(stderr);
  }

  return stdout;
}

class MetaTest {
  t: Deno.TestContext;
  engines: Engine[];

  constructor(t: Deno.TestContext) {
    this.t = t;
    this.engines = [];
  }

  async load(name: string, config: RuntimesConfig = {}): Promise<Engine> {
    const engine = await initTypegraph(
      await Deno.readTextFile(`./src/typegraphs/${name}.json`),
      {},
      deepMerge(testRuntimesConfig, config),
      null,
    );
    this.engines.push(engine);
    return engine;
  }

  async pythonCode(code: string, config: RuntimesConfig = {}): Promise<Engine> {
    const path = await Deno.makeTempFile({ suffix: ".py" });
    try {
      await Deno.writeTextFile(
        path,
        code,
      );
      return await this.parseTypegraph(
        ["../target/debug/meta", "serialize", "-f", path, "-1"],
        deepMerge(testRuntimesConfig, config),
      );
    } finally {
      await Deno.remove(path);
    }
  }

  async pythonFile(path: string, config: RuntimesConfig = {}): Promise<Engine> {
    return this.pythonCode(await Deno.readTextFile(path), config);
  }

  async parseTypegraph(
    cmd: string[],
    config: RuntimesConfig = {},
  ): Promise<Engine> {
    const stdout = await shell(cmd);

    const engine = await initTypegraph(
      stdout,
      {},
      deepMerge(testRuntimesConfig, config),
      null,
    );
    this.engines.push(engine);
    return engine;
  }

  async terminate() {
    await Promise.all(this.engines.map((e) => e.terminate()));
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
}

export function test(name: string, fn: (t: MetaTest) => void | Promise<void>) {
  return Deno.test(name, async (t) => {
    const mt = new MetaTest(t);
    try {
      await fn(mt);
    } catch (error) {
      throw error;
    } finally {
      await mt.terminate();
    }
  });
}

const testConfig = parse(Deno.args);

export function testAll(engineName: string) {
  test(`Auto-tests for ${engineName}`, async (t) => {
    const e = await t.load(engineName);

    for await (const f of Deno.readDir(`./tests/queries/${engineName}`)) {
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
  return new Q(template, {}, {}, []);
}

type Context = Record<string, unknown>;
type Expect = (res: Record<string, any>, ctx: Context) => void;
type Variables = Record<string, JSONValue>;
type Headers = Record<string, string>;

export class Q {
  query: string;
  headers: Headers;
  variables: Variables;
  expects: Expect[];

  constructor(
    query: string,
    headers: Headers,
    variables: Variables,
    expects: Expect[],
  ) {
    this.query = query;
    this.headers = headers;
    this.variables = variables;
    this.expects = expects;
  }

  static async fs(path: string, engine: Engine) {
    const input = `./tests/queries/${path}.graphql`;
    const output = `./tests/queries/${path}.json`;
    const query = Deno.readTextFile(input);
    if (testConfig.override || !(await exists(output))) {
      const { status, ...result } = await engine!.execute(
        await query,
        null,
        {},
        {},
      );
      await Deno.writeTextFile(output, JSON.stringify(result, null, 2));
    }
    const result = Deno.readTextFile(output);
    return new Q(await query, {}, {}, [])
      .expectValue(JSON.parse(await result))
      .on(engine);
  }

  withHeaders(headers: Headers) {
    return new Q(
      this.query,
      deepMerge(this.headers, headers),
      this.variables,
      this.expects,
    );
  }

  withVars(variables: Variables) {
    return new Q(
      this.query,
      this.headers,
      deepMerge(this.variables, variables),
      this.expects,
    );
  }

  withExpect(expect: Expect) {
    return new Q(this.query, this.headers, this.variables, [
      ...this.expects,
      expect,
    ]);
  }

  expectStatus(status: number) {
    return this.withExpect((res, ctx) => {
      assertEquals(ctx.status, status);
    });
  }

  expectValue(result: JSONValue) {
    return this.withExpect((res, ctx) => {
      assertEquals(res, result);
    });
  }

  expectData(data: JSONValue) {
    return this.expectValue({ data });
  }

  expectErrorContains(partial: string) {
    return this.withExpect((res, ctx) => {
      assertExists(Array.isArray(res.errors));
      assert(res.errors.length > 0);
      assertStringIncludes(res.errors[0].message, partial);
    });
  }

  async on(engine: Engine) {
    const { status, ...json } = await engine.execute(
      this.query,
      null,
      this.variables,
      this.headers,
    );
    const res = JSON.parse(JSON.stringify(json));
    if (res.errors) {
      for (const err of res.errors) {
        console.error(err.message);
      }
    }
    const ctx = { status };
    for (const expect of this.expects) {
      expect(res, ctx);
    }
  }
}
