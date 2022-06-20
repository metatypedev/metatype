import { ComputeStage } from "../engine.ts";
import { TypeGraphDS, TypeMaterializer } from "../typegraph.ts";
import { Resolver, Runtime, RuntimeConfig } from "./Runtime.ts";
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
  type: string,
): string | FormData => {
  switch (type) {
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
      throw new Error(`Content-Type ${type} not supported`);
  }
};

export class HTTPRuntime extends Runtime {
  endpoint: string;

  constructor(endpoint: string) {
    super();
    this.endpoint = endpoint;
  }

  static init(
    typegraph: TypeGraphDS,
    materializers: TypeMaterializer[],
    args: Record<string, unknown>,
    config: RuntimeConfig,
  ): Runtime {
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
        },
        body: method === "GET" || method === "DELETE" ? null : body,
      });

      if (res.headers.get("content-type") === "application/json") {
        return traverseLift(await res.json());
      } else if (res.headers.get("content-type") === "text/plain") {
        return traverseLift(await res.text());
      } else if (res.status === 204) { // no content
        return traverseLift(true);
      }
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
