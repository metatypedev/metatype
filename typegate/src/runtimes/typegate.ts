// Copyright Metatype under the Elastic License 2.0.

import { Runtime } from "./Runtime.ts";
import { ComputeStage } from "../engine.ts";
import { Register } from "../register.ts";
import config from "../config.ts";
import * as path from "std/path/mod.ts";
import { Resolver } from "../types.ts";
import { SystemTypegraph } from "../system_typegraphs.ts";

interface StructField {
  name: string;
  typedef: string;
}

interface StructNode {
  name: string;
  typedef: "struct";
  fields: Record<string, StructField>;
}

interface FuncNode {
  name: string;
  typedef: "func" | "gen";
  fields: {
    input: StructField;
    output: StructField;
  };
}

type Node = StructNode | FuncNode;

const localGraphs = ["introspection", "test"];
const dirName = path.dirname(path.fromFileUrl(import.meta.url));

export class TypeGateRuntime extends Runtime {
  static singleton: TypeGateRuntime | null = null;

  private constructor(private register: Register) {
    super();
  }

  static init(register: Register): Runtime {
    if (!TypeGateRuntime.singleton) {
      TypeGateRuntime.singleton = new TypeGateRuntime(register);
    }
    return TypeGateRuntime.singleton;
  }

  async deinit(): Promise<void> {}

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
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
      if (name === "serializedTypegraph") {
        return this.serializedTypegraph;
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

  typegraphs: Resolver = () => {
    return this.register.list().map((e) => {
      return {
        name: e.name,
        url: () => `${config.tg_external_url}/${e.name}`,
      };
    });
  };

  typegraph: Resolver = ({ name }) => {
    const tg = this.register.get(name);
    if (!tg) {
      return null;
    }
    return {
      name: tg.name,
      url: `${config.tg_external_url}/${tg.name}`,
    };
  };

  serializedTypegraph: Resolver = (
    { _: { parent: typegraph } },
  ) => {
    const tg = this.register.get(typegraph.name as string);
    if (!tg) {
      return null;
    }

    return JSON.stringify(tg.tg.tg);
  };

  addTypegraph: Resolver = async ({ fromString }) => {
    const name = JSON.parse(fromString).types[0].name as string;

    if (SystemTypegraph.check(name)) {
      throw new Error(`Typegraph name ${name} cannot be used`);
    }

    if (localGraphs.includes(name)) {
      await Deno.writeTextFile(
        path.join(dirName, "../typegraphs", `${name}.json`),
        `${fromString}\n`,
      );
    } else {
      await this.register.set(fromString);
    }
    return { name };
  };

  removeTypegraph: Resolver = ({ name }) => {
    if (SystemTypegraph.check(name)) {
      throw new Error(`Typegraph ${name} cannot be removed`);
    }

    return this.register.remove(name);
  };
}
