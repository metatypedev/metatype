// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import {
  assert,
  assertEquals,
  AssertionError,
  assertStringIncludes,
} from "std/testing/asserts.ts";
import { Engine } from "../../src/engine.ts";
import { JSONValue } from "../../src/utils.ts";
import { deepMerge } from "std/collections/deep_merge.ts";
import { join } from "std/path/mod.ts";
import { signJWT } from "../../src/crypto.ts";
import { parse } from "std/flags/mod.ts";

import { None } from "monads";
import { execute, testDir } from "../utils.ts";

import { MetaTest } from "./metatest.ts";
import { exists } from "std/fs/exists.ts";

const testConfig = parse(Deno.args);

type Expect = (res: Response) => Promise<void> | void;
type Variables = Record<string, JSONValue>;
type Context = Record<string, unknown>;
type ContextEncoder = (context: Context) => Promise<string>;

const defaultContextEncoder: ContextEncoder = async (context) => {
  const jwt = await signJWT({ provider: "internal", ...context }, 5);
  return `Bearer ${jwt}`;
};

interface ResponseBodyError {
  message: string;
}

interface ResponseBody {
  data?: string;
  errors?: ResponseBodyError[];
}

export class Q {
  query: string;
  context: Context;
  contextEncoder: ContextEncoder;
  variables: Variables;
  headers: Record<string, string>;
  expects: Expect[];

  constructor(
    query: string,
    context: Context,
    variables: Variables,
    headers: Record<string, string>,
    expects: Expect[],
    contextEncoder: ContextEncoder = defaultContextEncoder,
  ) {
    this.query = query;
    this.context = context;
    this.contextEncoder = contextEncoder;
    this.variables = variables;
    this.headers = headers;
    this.expects = expects;
  }

  static async fs(path: string, engine: Engine) {
    const input = join(testDir, `auto/queries/${path}.graphql`);
    const output = join(testDir, `auto/queries/${path}.json`);
    const query = Deno.readTextFile(input);
    if (testConfig.override || !await exists(output)) {
      const { ...result } = await engine!.execute(
        await query,
        None,
        {},
        {},
        { headers: {}, url: new URL("") },
        null,
      );
      await Deno.writeTextFile(output, JSON.stringify(result, null, 2));
    }
    const result = Deno.readTextFile(output);
    return new Q(await query, {}, {}, {}, [])
      .expectValue(JSON.parse(await result))
      .on(engine);
  }

  withContext(context: Context, contextEncoder?: ContextEncoder) {
    return new Q(
      this.query,
      deepMerge(this.context, context),
      this.variables,
      this.headers,
      this.expects,
      contextEncoder || this.contextEncoder,
    );
  }

  withVars(variables: Variables) {
    return new Q(
      this.query,
      this.context,
      deepMerge(this.variables, variables),
      this.headers,
      this.expects,
      this.contextEncoder,
    );
  }

  withHeaders(headers: Record<string, string>) {
    return new Q(
      this.query,
      this.context,
      this.variables,
      deepMerge(this.headers, headers),
      this.expects,
      this.contextEncoder,
    );
  }

  expect(expect: Expect) {
    return new Q(
      this.query,
      this.context,
      this.variables,
      this.headers,
      [
        ...this.expects,
        expect,
      ],
      this.contextEncoder,
    );
  }

  expectStatus(status: number) {
    return this.expect((res) => {
      assertEquals(res.status, status);
    });
  }

  expectBody(expect: (body: any) => Promise<void> | void) {
    return this.expect(async (res) => {
      try {
        const json = await res.json();
        await expect(json);
      } catch (error) {
        console.error(
          `cannot expect json body with status ${res.status}: ${error}`,
        );
        throw error;
      }
    });
  }

  /**
   * Asserts if the response body error matches the previous generated snapshot
   */
  matchErrorSnapshot(testContext: MetaTest): Q {
    return this.expectBody((body: ResponseBody) => {
      if (body.errors === undefined) {
        throw new AssertionError(
          "should have 'errors' field in the response body",
        );
      }
      const errors: string[] = body.errors.map((error) => error.message);
      testContext.assertSnapshot(errors);
    });
  }

  /**
   * Asserts if the response body matches the previous generated snapshot
   */
  matchSnapshot(testContext: MetaTest): Q {
    return this.expectBody((body: ResponseBody) => {
      if (body.data === undefined) {
        throw new AssertionError(
          "should have 'data' field in the response body",
        );
      }
      testContext.assertSnapshot(body.data);
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

  async on(engine: Engine, host = "http://typegate.local") {
    const { query, variables, headers, context, expects } = this;

    const defaults: Record<string, string> = {};

    if (Object.keys(context).length > 0) {
      defaults["Authorization"] = await this.contextEncoder(context);
    }

    const request = new Request(`${host}/${engine.name}`, {
      method: "POST",
      body: JSON.stringify({
        query,
        variables,
        operationName: null,
      }),
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
