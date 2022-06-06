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

  static init(): Promise<Runtime> {
    if (!TypeGateRuntime.singleton) {
      TypeGateRuntime.singleton = new TypeGateRuntime();
    }
    return TypeGateRuntime.singleton;
  }

  async deinit(): Promise<void> {}

  materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    verbose: boolean
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

      return async ({ _: { parent }, ...args }) => {
        const resolver = parent[stage.props.node];
        const ret =
          typeof resolver === "function" ? await resolver(args) : resolver;
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
    return register.list().map((e) => ({
      name: e.name,
      url: `http://${config.tg_host}:${config.tg_port}/${e.name}`,
    }));
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

  addTypegraph = async ({ fromString }: { fromString: string }) => {
    const name = JSON.parse(fromString).types[0].name;

    if (localGraphs.includes(name)) {
      await Deno.writeTextFile(
        path.join(dirName, "../typegraphs", `${name}.json`),
        `${fromString}\n`
      );
    } else {
      await register.set(fromString);
    }
    return { name };
  };

  removeTypegraph = ({ name }: { name: string }) => {
    return register.remove(name);
  };
}
