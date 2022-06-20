import { ComputeStage } from "../engine.ts";
import { TypeGraphDS, TypeMaterializer } from "../typegraph.ts";
import { Resolver, Runtime, RuntimeConfig } from "./Runtime.ts";
import { associateWith, intersect, withoutAll } from "std/collections/mod.ts";
import { join } from "std/path/mod.ts";
import { JSONValue } from "../utils.ts";

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

interface ReplaceDynamicPathParamsResult {
  pathname: string;
  restArgs: Record<string, any>;
}

const replaceDynamicPathParams = (
  pathPattern: string,
  queryArgs: Record<string, any>,
): ReplaceDynamicPathParamsResult => {
  const restArgs = { ...queryArgs };
  const pathname = pathPattern.replace(/\{\w+\}/, (match) => {
    const key = match.substring(1, match.length - 1);
    if (Object.hasOwnProperty.call(restArgs, key)) {
      const value = restArgs[key];
      delete restArgs[key];
      return value;
    } else {
      //? throw??
      return match;
    }
  });
  return { pathname, restArgs };
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

interface MatOptions extends Record<string, any> {
  content_type: "application/json" | "application/x-www-form-urlencoded";
  query_fields: string[] | null;
  body_fields: string[] | null;
}

interface FieldLists {
  query: string[];
  body: string[];
}

// TODO: name clash case
/**
 * Select which fields of the input go in the query and which ones go in the body
 * @param method -- HTTP verb
 * @param args -- GraphQL query input, dynamic path params excluded
 * @param options -- options from the materializer
 * @returns list of fields for the query and the body
 *
 * If both field lists from `options` are `null`, all the fields go in the query
 * for GET and DELETE request, and in the body for POST, PUT and PATCH.
 * If one and only one of the given field lists is `null`, the
 * corresponding target will receive all the fields not specified in the
 * non-null list; except for GET and DELETE requests when the body field list,
 * the body field list will be empty.
 */
const getFieldLists = (
  method: string,
  args: Record<string, any>,
  options: MatOptions,
): FieldLists => {
  const { query_fields, body_fields } = options;
  const fields = Object.keys(args);
  switch (method) {
    case "GET":
    case "DELETE":
      if (query_fields == null) {
        if (body_fields == null) {
          return {
            query: fields,
            body: [],
          };
        } else {
          return {
            query: withoutAll(fields, body_fields),
            body: intersect(fields, body_fields),
          };
        }
      } else {
        if (body_fields == null) {
          return {
            query: intersect(fields, query_fields),
            body: [],
          };
        } else {
          return {
            query: intersect(fields, query_fields),
            body: intersect(fields, body_fields),
          };
        }
      }

    case "POST":
    case "PUT":
    case "PATCH":
      if (query_fields == null) {
        if (body_fields == null) {
          return {
            query: [],
            body: fields,
          };
        } else {
          return {
            query: withoutAll(fields, body_fields),
            body: intersect(fields, body_fields),
          };
        }
      } else {
        if (body_fields == null) {
          return {
            query: intersect(fields, query_fields),
            body: withoutAll(fields, query_fields),
          };
        } else {
          return {
            query: intersect(fields, query_fields),
            body: intersect(fields, body_fields),
          };
        }
      }
    default:
      throw new Error(`Unsupported HTTP verb ${method}`);
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
      const query = new URLSearchParams(
        associateWith(queryFields, (key) => args[key]),
      ).toString();
      const ret = await fetch(join(this.endpoint, `${pathname}?${query}`), {
        method,
        headers: {
          "Accept": "application/json",
          "Content-Type": options.content_type,
        },
        ...(method === "GET" ? {} : { body }),
      });
      const res = await ret.json();
      return traverseLift(res);
    };
  }

  private fetch(
    method: string,
    pathname: string,
    args: Record<string, any>,
    type: string,
  ): Promise<any> {
    const headers = {
      "Accept": "application/json",
    };
    switch (method) {
      case "GET":
      case "DELETE": {
        const search = new URLSearchParams(args).toString();
        return fetch(join(this.endpoint, `${pathname}?${search}`), {
          method,
          headers,
        });
      }

      default: // POST, PUT, PATCH ...(??)
        return fetch(join(this.endpoint, pathname), {
          headers: {
            ...headers,
            "Content-Type": type,
          },
          method,
          body: encodeRequestBody(args, type),
        });
    }
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
