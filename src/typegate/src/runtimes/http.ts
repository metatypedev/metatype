// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { ComputeStage } from "../engine/query_engine.ts";
import { Runtime } from "./Runtime.ts";
import { createUrl } from "../utils.ts";
import { MatOptions, replaceDynamicPathParams } from "./utils/http.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { encodeBase64 } from "std/encoding/base64.ts";
import { getLogger } from "../log.ts";
import { Logger } from "std/log/logger.ts";
import { HTTPRuntimeData } from "../typegraph/types.ts";
import { registerRuntime } from "./mod.ts";

const logger = getLogger(import.meta);

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
      logger.error(`Content-Type ${contentType} not supported`);
      throw new Error(`Content-Type ${contentType} not supported`);
  }
};

@registerRuntime("http")
export class HTTPRuntime extends Runtime {
  private logger: Logger;

  constructor(
    typegraphName: string,
    private endpoint: string,
    private client: Deno.HttpClient,
    private headers: Headers,
  ) {
    super(typegraphName);
    this.logger = getLogger(`http:${new URL(endpoint).hostname}`);
  }

  static init(
    params: RuntimeInitParams,
  ): Runtime {
    const { args, secretManager, typegraphName } = params as RuntimeInitParams<
      HTTPRuntimeData
    >;

    const caCerts = args.cert_secret
      ? [secretManager.secretOrFail(args.cert_secret as string)]
      : [];

    const client = Deno.createHttpClient({ caCerts });

    const headers = new Headers();
    if (args.basic_auth_secret) {
      headers.set(
        "authorization",
        `basic ${
          encodeBase64(
            secretManager.secretOrFail(args.basic_auth_secret as string),
          )
        }`,
      );
    }

    return new HTTPRuntime(
      typegraphName,
      args.endpoint as string,
      client,
      headers,
    );
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
      const hasBody = (options.body_fields?.length ?? 0) > 0 ||
        method !== "GET" &&
          method !== "DELETE";

      const { rename_fields } = options;
      for (const [key, value] of Object.entries(args)) {
        if (options.header_prefix && key.startsWith(options.header_prefix)) {
          headers.set(key.slice(options.header_prefix.length), value);
        } else {
          let correctKey = key;
          for (const placeholder in rename_fields) {
            const renameTo = rename_fields[placeholder];
            if (placeholder == key) {
              correctKey = renameTo;
              break;
            }
          }
          if (
            options.query_fields?.includes(key) || !hasBody
          ) {
            if (Array.isArray(value)) {
              value.forEach((v) => searchParams.append(correctKey, v));
            } else {
              searchParams.append(correctKey, value as string);
            }
          } else {
            bodyFields[correctKey] = value;
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
        this.logger.warn(
          `${pathname} - ${searchParams} - ${body} => ${res.status} : ${
            Deno.inspect({ res, options, args, bodyFields, hasBody, method })
          }`,
        );
        // TODO: only if return type is optional
      }

      const contentType = res.headers.get("content-type")?.split("; ")[0];
      switch (contentType) {
        case "application/json":
          return await res.json();
        case "text/plain":
          return await res.text();
      }

      if (res.status === 204) { // no content
        return true;
      }

      if (res.status === 404) { // not found
        return null;
      }

      this.logger.error(`Unsupported content type "${contentType}"`);
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
      stagesMat.push(
        field.withResolver(Runtime.resolveFromParent(field.props.node)),
      );
    }
    return stagesMat;
  }
}
