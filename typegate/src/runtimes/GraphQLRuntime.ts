import { ComputeStage } from "../engine.ts";
import { gq } from "../gq.ts";
import { TypeGraphDS, TypeMaterializer } from "../typegraph.ts";
import { JSONValue } from "../utils.ts";
import { Resolver, Runtime, RuntimeConfig } from "./Runtime.ts";

const stringifyQL = (obj: JSONValue): string => {
  if (Array.isArray(obj)) {
    return `[${obj.map(stringifyQL).join(", ")}]`;
  }
  if (typeof obj === "object" && obj !== null) {
    const values = Object.entries(obj)
      .map(([k, v]) => `${k}: ${stringifyQL(v)}`)
      .join(", ");
    return `{${values}}`;
  }
  return JSON.stringify(obj);
};

const rebuildGraphQuery = (
  stages: ComputeStage[],
  renames: Record<string, string>
): String => {
  let ret = "";
  let cursor = 0;
  while (cursor < stages.length) {
    const stage = stages[cursor];
    const children = stages
      .slice(cursor + 1)
      .filter((s) => s.id().startsWith(stage.id()));
    const field = stage.props.path[stage.props.path.length - 1];
    ret += ` ${field !== stage.props.node ? field + ": " : ""}${
      renames[stage.props.node] ?? stage.props.node
    }`;
    if (Object.keys(stage.props.args).length > 0) {
      ret += `(`;
      ret += Object.entries(stage.props.args)
        .map(
          ([argName, argValue]) =>
            `${argName}: ${stringifyQL(argValue({}) as JSONValue)}`
        )
        .join(", ");
      ret += `)`;
    }
    if (children.length > 0) {
      ret += ` {${rebuildGraphQuery(children, renames)} }`;
    }
    cursor += 1 + children.length;
  }
  return ret;
};

export class GraphQLRuntime extends Runtime {
  endpoint: string;

  constructor(endpoint: string) {
    super();
    this.endpoint = endpoint;
  }

  static async init(
    typegraph: TypeGraphDS,
    materializers: TypeMaterializer[],
    args: Record<string, unknown>,
    config: RuntimeConfig
  ): Promise<Runtime> {
    return new GraphQLRuntime(args.endpoint as string);
  }

  async deinit(): Promise<void> {}

  execute(query: string, variables: Record<string, unknown>): Resolver {
    return async (args) => {
      const ret = await gq(this.endpoint, query, variables);
      return ret.data;
    };
  }

  materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    verbose: boolean
  ): ComputeStage[] {
    const stagesMat: ComputeStage[] = [];

    const serial = stage.props.materializer?.data.serial;
    const sameRuntime = Runtime.collectRelativeStages(stage, waitlist);
    const fields = [stage, ...sameRuntime];
    const renames: Record<string, string> = {
      ql: "typegraph",
    };
    const query = `${serial ? "mutation" : "query"} q {${rebuildGraphQuery(
      fields,
      renames
    )} }`;
    verbose && console.log("remote graphql:", query);

    const queryStage = new ComputeStage({
      dependencies: [],
      args: {},
      policies: {},
      resolver: this.execute(query, {}),
      outType: {
        // dummy
        name: "string",
        typedef: "string",
        edges: [],
        policies: [],
        runtime: -1,
        data: {},
      },
      runtime: stage.props.runtime,
      batcher: (x: any) => x,
      node: "",
      path: [...stage.props.path.slice(0, -1), "query"],
    });
    stagesMat.push(queryStage);

    for (const field of fields) {
      if (field.props.parent?.id() === stage.props.parent?.id()) {
        const resolver: Resolver = ({
          _: { parent, [queryStage.id()]: queryRes },
        }) => {
          console.log(queryRes);
          const fieldName = field.props.path[field.props.path.length - 1];
          const resolver = queryRes[0][renames[fieldName] ?? fieldName];
          const ret = typeof resolver === "function" ? resolver() : resolver;
          return ret;
        };
        stagesMat.push(
          new ComputeStage({
            ...field.props,
            dependencies: [...field.props.dependencies, queryStage.id()],
            resolver,
          })
        );
      } else {
        const resolver: Resolver = ({ _: { parent } }) => {
          const resolver = parent[field.props.node];
          const ret = typeof resolver === "function" ? resolver() : resolver;
          return ret;
        };
        stagesMat.push(
          new ComputeStage({
            ...field.props,
            dependencies: [...field.props.dependencies, queryStage.id()],
            resolver,
          })
        );
      }
    }

    return stagesMat;
  }
}
