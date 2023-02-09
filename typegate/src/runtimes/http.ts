// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { ComputeStage } from "../engine.ts";
import { Runtime } from "./Runtime.ts";
import { createUrl, envOrFail, JSONValue } from "../utils.ts";
import { MatOptions, replaceDynamicPathParams } from "./utils/http.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
import * as base64 from "std/encoding/base64.ts";
import { getLogger } from "../log.ts";
import { Logger } from "std/log/logger.ts";

const traverseLift = (obj: JSONValue): any => {
  if (Array.isArray(obj)) {
    return obj.map(traverseLift);
  }
  if (typeof obj === "object" && obj !== null) {
    const res: any = {};
    for (const k in obj) {
      res[k] = () => traverseLift(obj[k]);
    }
    return res;
  }
  return obj;
};

const encodeRequestBody = (
  body: Record<string, any>,
  contentType: string,
): string | FormData => {
  const mapToFormData = (body: Record<string, any>) => {
    const formData = new FormData();
    for (const [name, value] of Object.entries(body)) {
      formData.append(name, value);
    }
    return formData;
  };
  switch (contentType) {
    case "application/json":
      return JSON.stringify(body);
    // -- form handler --
    case "application/x-www-form-urlencoded":
    case "multipart/form-data":
      return mapToFormData(body);
    // -- form handler --
    default:
      throw new Error(`Content-Type ${contentType} not supported`);
  }
};

export class HTTPRuntime extends Runtime {
  private logger: Logger;

  constructor(
    private endpoint: string,
    private client: Deno.HttpClient,
    private headers: Headers,
  ) {
    super();
    this.logger = getLogger(`http:${new URL(endpoint).hostname}`);
  }

  static init(params: RuntimeInitParams): Runtime {
    const { typegraph, args } = params;
    const typegraphName = typegraph.types[0].title;

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

  // deno-lint-ignore require-await
  async deinit(): Promise<void> {
    this.client.close();
  }

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

      const headers = new Headers(this.headers);
      headers.set("accept", "application/json");

      // if left unspecified, the http-client will assign a proper header automatically since
      // the request body is a `FormData` i.e. we get a multipart/form-data + a proper boundary for free
      if (options.content_type !== "multipart/form-data") {
        headers.set("content-type", options.content_type);
      }

      if (authToken) {
        headers.set("authorization", `Bearer ${authToken}`);
      }

      const bodyFields: Record<string, unknown> = {};
      const searchParams = new URLSearchParams();
      const hasBody = method !== "GET" && method !== "DELETE";

      for (const [key, value] of Object.entries(args)) {
        if (options.header_prefix && key.startsWith(options.header_prefix)) {
          headers.set(key.slice(options.header_prefix.length), value);
        } else {
          if (
            options.query_fields?.includes(key) || !hasBody
          ) {
            if (Array.isArray(value)) {
              value.forEach((v) => searchParams.append(key, v));
            } else {
              searchParams.append(key, value as string);
            }
          } else {
            bodyFields[key] = value;
          }
        }
      }

      const body = encodeRequestBody(
        bodyFields,
        options.content_type,
      );

      const res = await fetch(
        createUrl(this.endpoint, pathname, searchParams),
        {
          method,
          headers,
          body: hasBody ? body : null,
          client: this.client,
        },
      );

      if (res.status >= 400) {
        this.logger.warning(`${pathname} → ${body}`);
        // TODO: only if return type is optional
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

      if (res.status === 404) { // not found
        return traverseLift(null);
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
