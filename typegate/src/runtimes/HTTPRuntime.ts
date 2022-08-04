import { ComputeStage } from "../engine.ts";
import { TypeGraphDS, TypeMaterializer } from "../typegraph.ts";
import {
  Resolver,
  Runtime,
  RuntimeConfig,
  RuntimeInitParams,
} from "./Runtime.ts";
import { associateWith } from "std/collections/mod.ts";
import { join } from "std/path/mod.ts";
import { JSONValue } from "../utils.ts";
import {
  getFieldLists,
  MatOptions,
  replaceDynamicPathParams,
} from "./utils/http.ts";

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
  endpoint: string;

  constructor(endpoint: string) {
    super();
    this.endpoint = endpoint;
  }

  static init(params: RuntimeInitParams): Runtime {
    const { args } = params;
    return new HTTPRuntime(args.endpoint as string);
  }

  async deinit(): Promise<void> {}

  execute(method: string, pathPattern: string, options: MatOptions): Resolver {
    return async (resolverArgs) => {
      const { _, ...input } = resolverArgs;
      const { pathname, restArgs: args } = replaceDynamicPathParams(
        pathPattern,
        input,
      );

      const authToken = options.auth_token_field === null
        ? null
        : args[options.auth_token_field];
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

      const res = await fetch(join(this.endpoint, `${pathname}?${query}`), {
        method,
        headers: {
          "Accept": "application/json",
          "Content-Type": options.content_type,
          ...(authToken === null
            ? {}
            : { "Authorization": `Bearer ${authToken}` }),
        },
        body: method === "GET" || method === "DELETE" ? null : body,
      });

      if (res.status > 400) {
        // TODO: add error message
        // TODO: only if return type is optional
        // throw new Error(await res.text());
        return null;
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
    verbose: boolean,
  ): ComputeStage[] {
    const stagesMat: ComputeStage[] = [];

    const sameRuntime = Runtime.collectRelativeStages(stage, waitlist);

    console.log(stage.props.materializer);
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
        // console.log("bb");
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
