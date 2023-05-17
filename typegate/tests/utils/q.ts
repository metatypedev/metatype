// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

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
  constructor(
    public query: string,
    private context: Context,
    private variables: Variables,
    private headers: Record<string, string>,
    private files: Array<[file: File, paths: string[]]>,
    private expects: Expect[],
    private contextEncoder: ContextEncoder = defaultContextEncoder,
  ) {}

  private clone(patch: (q: Q) => void = (_q) => {}): Q {
    const q = new Q(
      this.query,
      this.context,
      this.variables,
      this.headers,
      this.files,
      this.expects,
      this.contextEncoder,
    );
    patch(q);
    return q;
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
    return new Q(await query, {}, {}, {}, [], [])
      .expectValue(JSON.parse(await result))
      .on(engine);
  }

  withContext(context: Context, contextEncoder?: ContextEncoder) {
    return this.clone((q) => {
      q.context = deepMerge(q.context, context);
      q.contextEncoder = contextEncoder || q.contextEncoder;
    });
  }

  withVars(variables: Variables) {
    return this.clone((q) => {
      q.variables = deepMerge(q.variables, variables);
    });
  }

  withHeaders(headers: Record<string, string>) {
    return this.clone((q) => {
      q.headers = deepMerge(q.headers, headers);
    });
  }

  withFile(file: File, paths: string[]) {
    if (paths.length === 0) {
      throw new Error("`paths` cannot be empty");
    }
    return this.clone((q) => {
      q.files = [...q.files, [file, paths]];
    });
  }

  expect(expect: Expect) {
    return this.clone((q) => {
      q.expects = [...q.expects, expect];
    });
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

  json() {
    const { query, variables } = this;
    return { query, variables, operationName: null };
  }

  formData() {
    const data = new FormData();
    data.set("operations", JSON.stringify(this.json()));
    const map: Record<string, string[]> = {};
    for (const [i, [file, paths]] of this.files.entries()) {
      const key = `${i}`;
      map[key] = paths;
      data.set(key, file);
    }
    data.set("map", JSON.stringify(map));
    return data;
  }

  async getRequest(url: string) {
    const { headers, context } = this;

    const defaults: Record<string, string> = {};

    if (Object.keys(context).length > 0) {
      defaults["Authorization"] = await this.contextEncoder(context);
    }
    if (this.files.length === 0) {
      return new Request(url, {
        method: "POST",
        body: JSON.stringify(this.json()),
        headers: {
          ...defaults,
          ...headers,
          "Content-Type": "application/json",
        },
      });
    } else {
      return new Request(url, {
        method: "POST",
        body: this.formData(),
        headers: {
          ...defaults,
          ...headers,
          // "Content-Type": "multipart/form-data",
        },
      });
    }
  }

  async on(engine: Engine, host = "http://typegate.local") {
    const request = await this.getRequest(`${host}/${engine.name}`);
    const response = await execute(engine, request);

    for (const expect of this.expects) {
      await expect(response);
    }
  }
}
