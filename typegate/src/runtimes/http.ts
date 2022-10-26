// Copyright Metatype under the Elastic License 2.0.

import { ComputeStage } from "../engine.ts";
import { Runtime } from "./Runtime.ts";
import { associateWith } from "std/collections/associate_with.ts";
import { join } from "std/path/mod.ts";
import { envOrFail, JSONValue } from "../utils.ts";
import {
  getFieldLists,
  MatOptions,
  replaceDynamicPathParams,
} from "./utils/http.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
import * as base64 from "std/encoding/base64.ts";

// FIXME better solution require
const traverseLift = (obj: JSONValue): any => {
  if (Array.isArray(obj)) {
    return obj.map(traverseLift);
  }
  if (typeof obj === "object" && obj !== null) {
    return Object.entries(obj).reduce(
      (agg, [k, v]) => ({ ...agg, [k]: () => v }),
      {},
    );
  }
  return obj;
};

const encodeRequestBody = (
  body: Record<string, any>,
  contentType: string,
): string | FormData => {
  switch (contentType) {
    case "application/json":
      return JSON.stringify(body);
    case "application/x-www-form-urlencoded": {
      const formData = new FormData();
      for (const [name, value] of Object.entries(body)) {
        formData.append(name, value);
      }
      return formData;
    }
    default:
      throw new Error(`Content-Type ${contentType} not supported`);
  }
};

export class HTTPRuntime extends Runtime {
  constructor(
    private endpoint: string,
    private client: Deno.HttpClient,
    private headers: Headers,
  ) {
    super();
  }

  static init(params: RuntimeInitParams): Runtime {
    const { typegraph, args } = params;
    const typegraphName = typegraph.types[0].name;

    const caCerts = args.cert_secret
      ? [envOrFail(typegraphName, args.cert_secret as string)]
      : [];

    const client = Deno.createHttpClient({ caCerts });

    const headers = new Headers();
    if (args.basic_auth_secret) {
      headers.set(
        "authorization",
        `basic ${
          base64.encode(
            envOrFail(typegraphName, args.basic_auth_secret as string),
          )
        }`,
      );
    }

    return new HTTPRuntime(args.endpoint as string, client, headers);
  }

  async deinit(): Promise<void> {}

  execute(method: string, pathPattern: string, options: MatOptions): Resolver {
    return async ({ _, ...input }) => {
      const { pathname, restArgs: args } = replaceDynamicPathParams(
        pathPattern,
        input,
      );

      // TODO remove the need to have a token field to benefinit from injections
      const authToken = options.auth_token_field
        ? args[options.auth_token_field]
        : null;
      if (authToken) {
        delete args[options.auth_token_field!];
      }

      const { body: bodyFields, query: queryFields } = getFieldLists(
        method,
        args,
        options,
      );
      const body = encodeRequestBody(
        associateWith(bodyFields, (key) => args[key]),
        options.content_type,
      );

      const searchParams = new URLSearchParams();
      queryFields.forEach((key) => {
        const value = args[key];
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, v));
        } else {
          searchParams.append(key, value);
        }
      });
      const query = searchParams.toString();

      const headers = new Headers(this.headers);
      headers.set("accept", "application/json");
      headers.set("content-type", options.content_type);

      if (authToken) {
        headers.set("authorization", `Bearer ${authToken}`);
      }

      const res = await fetch(join(this.endpoint, `${pathname}?${query}`), {
        method,
        headers,
        body: method === "GET" || method === "DELETE" ? null : body,
        client: this.client,
      });

      if (res.status >= 400) {
        // TODO: add error message
        // TODO: only if return type is optional
        // throw new Error(await res.text());
        return traverseLift(null);
      }

      const contentType = res.headers.get("content-type")?.split("; ")[0];
      switch (contentType) {
        case "application/json":
          return traverseLift(await res.json());
        case "text/plain":
          return traverseLift(await res.text());
      }

      if (res.status === 204) { // no content
        return traverseLift(true);
      }

      throw new Error(`Unsupported content type "${contentType}"`);
    };
  }

  materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    const stagesMat: ComputeStage[] = [];

    const sameRuntime = Runtime.collectRelativeStages(stage, waitlist);

    const { verb, path, ...options } = stage.props.materializer?.data ?? {};
    stagesMat.push(
      new ComputeStage({
        ...stage.props,
        resolver: this.execute(
          verb as string,
          path as string,
          options as MatOptions,
        ),
      }),
    );

    for (const field of sameRuntime) {
      const resolver: Resolver = ({ _: { parent } }) => {
        const resolver = parent[field.props.node];
        const ret = typeof resolver === "function" ? resolver() : resolver;
        return ret;
      };
      stagesMat.push(
        new ComputeStage({
          ...field.props,
          resolver,
        }),
      );
    }
    return stagesMat;
  }
}
