// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  assert,
  assertEquals,
  AssertionError,
  assertStringIncludes,
} from "std/testing/asserts.ts";
import { Engine } from "../../../src/engine.ts";
import { JSONValue } from "../../../src/utils.ts";
import { deepMerge } from "std/collections/deep_merge.ts";
import { signJWT } from "../../../src/crypto.ts";

import { execute } from "../mod.ts";

import { MetaTest } from "../test.ts";

export type Expect = (res: Response) => Promise<void> | void;
export type Variables = Record<string, unknown>;
export type Context = Record<string, unknown>;
export type ContextEncoder = (context: Context) => Promise<string>;

export const defaultContextEncoder: ContextEncoder = async (context) => {
  const jwt = await signJWT({ provider: "internal", ...context }, 5);
  return `Bearer ${jwt}`;
};

interface ResponseBodyError {
  message: string;
  extensions: Record<string, unknown>;
}

interface ResponseBody {
  data?: string;
  errors?: ResponseBodyError[];
}

export abstract class Query {
  constructor(
    protected context: Context,
    protected variables: Variables,
    protected headers: Record<string, string>,
    protected expects: Expect[],
    protected contextEncoder: ContextEncoder,
  ) {}

  protected abstract clone(patch: (q: this) => void): this;

  withContext(context: Context, contextEncoder?: ContextEncoder): this {
    return this.clone((q) => {
      q.context = deepMerge(q.context, context);
      q.contextEncoder = contextEncoder || q.contextEncoder;
    });
  }

  withVars(variables: Variables): this {
    return this.clone((q) => {
      q.variables = deepMerge(q.variables, variables);
    });
  }

  withHeaders(headers: Record<string, string>): this {
    return this.clone((q) => {
      q.headers = deepMerge(q.headers, headers);
    });
  }

  withoutHeaders(headers: Array<string>): this {
    return this.clone((q) => {
      for (const name of headers) {
        q.headers[name] = "NULL";
      }
    });
  }

  expect(expect: Expect): this {
    return this.clone((q) => {
      q.expects = [...q.expects, expect];
    });
  }

  expectStatus(status: number): this {
    return this.expect((res) => {
      assertEquals(res.status, status);
    });
  }

  expectBody(expect: (body: any) => Promise<void> | void): this {
    return this.expect(async (res) => {
      try {
        if (res.headers.get("Content-Type") === "application/json") {
          const json = await res.json();
          await expect(json);
        } else {
          const text = await res.text();
          await expect(text);
        }
      } catch (error) {
        console.error(
          `cannot expect json body with status ${res.status}: ${error}`,
        );
        throw error;
      }
    });
  }

  matchSnapshot(testContext: MetaTest): this {
    return this.expectBody(async (body: ResponseBody) => {
      if (body.errors) {
        body.errors.forEach((error) => {
          delete error.extensions?.timestamp;
        });
      }
      await testContext.assertSnapshot(body);
    });
  }

  matchErrorSnapshot(testContext: MetaTest): this {
    return this.expectBody(async (body: ResponseBody) => {
      if (body.errors === undefined) {
        throw new AssertionError(
          `should have 'errors' field in the response body: ${
            JSON.stringify(body)
          }`,
        );
      }
      const errors: string[] = body.errors.map((error) => error.message);
      await testContext.assertSnapshot(errors);
    });
  }

  matchOkSnapshot(testContext: MetaTest): this {
    return this.expectBody(async (body: ResponseBody) => {
      if (body.data === undefined) {
        throw new AssertionError(
          `should have 'data' field in the response body: ${
            JSON.stringify(body)
          }`,
        );
      }
      await testContext.assertSnapshot(body.data);
    });
  }

  expectJSON(result: JSONValue): this {
    return this.expectBody((body) => {
      assertEquals(body, result);
    });
  }

  expectData(data: JSONValue): this {
    return this.expectJSON({ data });
  }

  expectErrorContains(partial: string): this {
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

  abstract getRequest(url: string): Promise<Request>;

  async on(engine: Engine, host = "http://typegate.local"): Promise<void> {
    const request = await this.getRequest(`${host}/${engine.name}`);
    const response = await execute(engine, request);

    for (const expect of this.expects) {
      await expect(response);
    }
  }
}
