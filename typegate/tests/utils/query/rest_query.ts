// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  Context,
  ContextEncoder,
  defaultContextEncoder,
  Expect,
  Query,
  Variables,
} from "./mod.ts";

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

  async getRequest(url: string): Promise<Request> {
    const { method, name, headers, context } = this;
    const uri = new URL(`${url}/rest/${name}`);

    const defaults: Record<string, string> = {};

    if (method === "GET") {
      Object.entries(this.variables).forEach(([key, value]) => {
        uri.searchParams.append(
          key,
          typeof value === "string" ? value : JSON.stringify(value),
        );
      });
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
