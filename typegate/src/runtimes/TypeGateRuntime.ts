import {
  TypeGraphDS,
  TypeMaterializer,
  TypeNode as TypeGraphTypeNode,
} from "../typegraph.ts";
import { ensure } from "../utils.ts";
import { Resolver, Runtime, RuntimeConfig } from "./Runtime.ts";
import { ComputeStage } from "../engine.ts";
import { register } from "../register.ts";
import config from "../config.ts";
import * as path from "std/path/mod.ts";

type TypeNode = Pick<TypeGraphTypeNode, "name" | "typedef">;
interface Edge<T> {
  from: T;
  to: T;
  name: string;
}

const localGraphs = ["introspection", "typegate", "test"];
const dirName = path.dirname(path.fromFileUrl(import.meta.url));

export class TypeGateRuntime extends Runtime {
  static singleton: TypeGateRuntime | null = null;

  private constructor() {
    super();
  }

  static init(): Runtime {
    if (!TypeGateRuntime.singleton) {
      TypeGateRuntime.singleton = new TypeGateRuntime();
    }
    return TypeGateRuntime.singleton;
  }

  async deinit(): Promise<void> {}

  materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    verbose: boolean,
  ): ComputeStage[] {
    const resolver: Resolver = (() => {
      const name = stage.props.materializer?.name;
      if (name === "addTypegraph") {
        return this.addTypegraph;
      }
      if (name === "removeTypegraph") {
        return this.removeTypegraph;
      }
      if (name === "typegraphs") {
        return this.typegraphs;
      }
      if (name === "typegraph") {
        return this.typegraph;
      }
      if (name === "typesAsGraph") {
        return this.typesAsGraph;
      }

      return async ({ _: { parent }, ...args }) => {
        const resolver = parent[stage.props.node];
        const ret = typeof resolver === "function"
          ? await resolver(args)
          : resolver;
        return ret;
      };
    })();

    return [
      new ComputeStage({
        ...stage.props,
        resolver,
      }),
    ];
  }

  typegraphs = () => {
    return register.list().map((e) => {
      const { name, typedef, edges, data } = e.tg.type(0);
      return {
        name: e.name,
        url: `http://${config.tg_host}:${config.tg_port}/${e.name}`,
        rootType: { idx: 0, name, typedef, edges, data: JSON.stringify(data) },
      };
    });
  };

  typegraph = ({ name }: { name: string }) => {
    const tg = register.get(name);
    if (!tg) {
      return null;
    }
    return {
      name: tg.name,
      url: `http://${config.tg_host}:${config.tg_port}/${tg.name}`,
    };
  };

  typesAsGraph = (
    { _: { parent: typegraph } }: { _: { parent: { name: string } } },
  ) => {
    const tg = register.get(typegraph.name);
    if (!tg) {
      return null;
    }

    const types = {
      nodes: [] as TypeNode[],
      edges: [] as Edge<TypeNode>[],
    };

    const serialized_types = tg.tg.tg.types;
    for (const type of serialized_types) {
      const { name, typedef, data } = type;
      types.nodes.push({ name, typedef });
      const from = { name, typedef };
      const getNode = (type: TypeGraphTypeNode): TypeNode => ({
        name: type.name,
        typedef: type.typedef,
      });
      switch (typedef) {
        case "struct":
          for (
            const [key, val] of Object.entries(
              data.binds as Record<string, number>,
            )
          ) {
            types.edges.push({
              from,
              to: getNode(tg.tg.type(val)),
              name: key,
            });
          }
          break;

        case "func":
          types.edges.push({
            from,
            to: getNode(tg.tg.type(data.input as number)),
            name: "input",
          });
        /* fall through */
        case "gen":
          types.edges.push({
            from,
            to: getNode(tg.tg.type(data.output as number)),
            name: "output",
          });
          break;

        case "list":
        case "optional":
          types.edges.push({
            from,
            to: getNode(tg.tg.type(data.of as number)),
            name: "item",
          });
          break;

        default:
          // console.log(`typedef: ${typedef}, data: ${JSON.stringify(type)}`);
      }
    }

    return types;
  };

  addTypegraph = async ({ fromString }: { fromString: string }) => {
    const name = JSON.parse(fromString).types[0].name;

    if (localGraphs.includes(name)) {
      await Deno.writeTextFile(
        path.join(dirName, "../typegraphs", `${name}.json`),
        `${fromString}\n`,
      );
    } else {
      await register.set(fromString);
    }
    return { name };
  };

  removeTypegraph = ({ name }: { name: string }) => {
    return register.remove(name);
  };

  typenode = (
    { typegraphName, idx }: { typegraphName: string; idx: number },
  ) => {
    const engine = register.get(typegraphName);
    if (!engine) {
      return null;
    }
    const tg = engine.tg;
    const type = tg.type(idx);
    if (!type) {
      return null;
    }
    const { name, typedef, edges, data } = type;
    return {
      idx,
      name,
      typedef,
      edges,
      data: JSON.stringify(data),
    };
  };
}
