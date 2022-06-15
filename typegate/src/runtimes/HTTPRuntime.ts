import { ComputeStage } from "../engine.ts";
import { TypeGraphDS, TypeMaterializer } from "../typegraph.ts";
import { Resolver, Runtime, RuntimeConfig } from "./Runtime.ts";
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

const getPath = (
  pathPattern: string,
  queryArgs: Record<string, any>,
): string => {
  const pathname = pathPattern.replace(/\{\w+\}/, (match) => {
    const key = match.substring(1, match.length - 1);
    if (Object.hasOwnProperty.call(queryArgs, key)) {
      const value = queryArgs[key];
      delete queryArgs[key];
      return value;
    } else {
      //? throw??
      return match;
    }
  });
  const search = new URLSearchParams(queryArgs).toString();
  return `${pathname}?${search}`;
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

  execute(method: string, pathPattern: string): Resolver {
    return async (args) => {
      const { _, ...queryArgs } = args;
      const path = getPath(pathPattern, queryArgs);
      const ret = await fetch(join(this.endpoint, path), { method });
      const res = await ret.json();
      return traverseLift(res);
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
    const { verb, path } = stage.props.materializer?.data ?? {};
    stagesMat.push(
      new ComputeStage({
        ...stage.props,
        resolver: this.execute(verb as string, path as string),
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
