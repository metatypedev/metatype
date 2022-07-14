import { TypeGraphDS, TypeMaterializer } from "../typegraph.ts";
import { ensure } from "../utils.ts";
import { Resolver, Runtime, RuntimeConfig } from "./Runtime.ts";
import { ComputeStage } from "../engine.ts";
import { register } from "../register.ts";
import config from "../config.ts";
import * as path from "std/path/mod.ts";

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
      if (name === "typenode") {
        return this.typenode;
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

    const { name: rootTypeName, typedef, edges, data } = tg.tg.type(0);
    return {
      name: tg.name,
      url: `http://${config.tg_host}:${config.tg_port}/${tg.name}`,
      rootType: {
        idx: 0,
        name: rootTypeName,
        typedef,
        edges,
        data: JSON.stringify(data),
      },
    };
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
