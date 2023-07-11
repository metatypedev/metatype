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
import { signJWT } from "../../src/crypto.ts";

import { execute } from "../utils.ts";

import { MetaTest } from "./metatest.ts";

type Expect = (res: Response) => Promise<void> | void;
type Variables = Record<string, unknown>;
type Context = Record<string, unknown>;
type ContextEncoder = (context: Context) => Promise<string>;

const defaultContextEncoder: ContextEncoder = async (context) => {
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

class FileExtractor {
  private map: Map<File, string[]> = new Map();

  private addFile(file: File, path: string) {
    if (this.map.has(file)) {
      this.map.get(file)!.push(path);
    } else {
      this.map.set(file, [path]);
    }
  }

  private traverse(
    parent: Array<unknown>,
    index: number,
    parentPath: string,
  ): void;
  private traverse(
    parent: Record<string, unknown>,
    key: string,
    parentPath: string,
  ): void;
  private traverse(
    parent: Array<unknown> | Record<string, unknown>,
    field: string | number,
    parentPath: string,
  ) {
    const path = `${parentPath}.${field}`;
    const value = (parent as Record<string | number, unknown>)[field];
    if (typeof value === "object" && value != null) {
      if (value instanceof File) {
        (parent as Record<string | number, unknown>)[field] = null;
        this.addFile(value, path);
      } else if (Array.isArray(value)) {
        for (let i = 0; i < value.length; ++i) {
          this.traverse(value, i, path);
        }
      } else {
        for (const key of Object.keys(value)) {
          this.traverse(value as Record<string, unknown>, key, path);
        }
      }
    }
  }

  extractFilesFromVars(variables: Variables): Map<File, string[]> {
    for (const key of Object.keys(variables)) {
      this.traverse(variables, key, "variables");
    }
    return this.map;
  }
}

abstract class Query {
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

  expectValue(result: JSONValue): this {
    return this.expectBody((body) => {
      assertEquals(body, result);
    });
  }

  expectData(data: JSONValue): this {
    return this.expectValue({ data });
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

export class RestQuery extends Query {
  constructor(
    public method: string,
    public name: string,
    context: Context,
    variables: Variables,
    headers: Record<string, string>,
    expects: Expect[],
    contextEncoder: ContextEncoder = defaultContextEncoder,
  ) {
    super(context, variables, headers, expects, contextEncoder);
  }

  protected clone(patch: (q: this) => void = (_q) => {}): this {
    const q = new (this.constructor as any)(
      this.method,
      this.name,
      this.context,
      this.variables,
      this.headers,
      this.expects,
      this.contextEncoder,
    );
    patch(q);
    return q;
  }

  private mapStringify(obj: Record<string, unknown>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(obj).map((
        [key, value],
      ) => [key, typeof value === "string" ? value : JSON.stringify(value)]),
    );
  }

  async getRequest(url: string): Promise<Request> {
    const { method, name, headers, context } = this;
    let uri = `${url}/rest/${name}`;

    const defaults: Record<string, string> = {};

    if (method === "GET") {
      uri += `?${new URLSearchParams(this.mapStringify(this.variables))}`;
    } else {
      defaults["Content-Type"] = "application/json";
    }

    if (Object.keys(context).length > 0) {
      defaults["Authorization"] = await this.contextEncoder(context);
    }

    return new Request(uri, {
      method,
      body: method === "GET" ? undefined : JSON.stringify(this.variables),
      headers: {
        ...defaults,
        ...headers,
      },
    });
  }
}

export class GraphQLQuery extends Query {
  constructor(
    public query: string,
    context: Context,
    variables: Variables,
    headers: Record<string, string>,
    expects: Expect[],
    contextEncoder: ContextEncoder = defaultContextEncoder,
  ) {
    super(context, variables, headers, expects, contextEncoder);
  }

  protected clone(patch: (q: this) => void = (_q) => {}): this {
    const q = new (this.constructor as any)(
      this.query,
      this.context,
      this.variables,
      this.headers,
      this.expects,
      this.contextEncoder,
    );
    patch(q);
    return q;
  }

  json() {
    const { query, variables } = this;
    return { query, variables, operationName: null };
  }

  formData(files: Map<File, string[]>) {
    const data = new FormData();
    data.set("operations", JSON.stringify(this.json()));
    const map: Record<string, string[]> = {};
    for (const [i, [file, paths]] of [...files.entries()].entries()) {
      const key = `${i}`;
      map[key] = paths;
      data.set(key, file);
    }
    data.set("map", JSON.stringify(map));
    return data;
  }

  private extractFilesFromVars(): Map<File, string[]> {
    return new FileExtractor().extractFilesFromVars(this.variables);
  }

  async getRequest(url: string) {
    const { headers, context } = this;

    const defaults: Record<string, string> = {};

    if (Object.keys(context).length > 0) {
      defaults["Authorization"] = await this.contextEncoder(context);
    }

    const clean = (headers: Record<string, string>) => {
      for (const [k, v] of Object.entries(headers)) {
        if (v === "NULL") {
          delete headers[k];
        }
      }
      return headers;
    };

    const getContentLength = (length: number) => {
      for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === "content-length") {
          // skip if exist
          return {};
        }
      }
      return { "Content-Length": `${length}` } as Record<string, string>;
    };

    const files = this.extractFilesFromVars();
    if (files.size === 0) {
      const body = JSON.stringify(this.json());
      return new Request(url, {
        method: "POST",
        body,
        headers: clean({
          ...defaults,
          ...headers,
          ...getContentLength(body.length),
          "Content-Type": "application/json",
        }),
      });
    } else {
      const body = this.formData(files);
      const length = Array.from(body.entries()).reduce(
        (acc, [_, v]) => acc + (typeof v === "string" ? v.length : v.size),
        0,
      );

      return new Request(url, {
        method: "POST",
        body,
        headers: clean({
          ...defaults,
          ...headers,
          ...getContentLength(length),
          // "Content-Type": "multipart/form-data",
        }),
      });
    }
  }
}
