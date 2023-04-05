// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Runtime } from "./Runtime.ts";
import { ComputeStage } from "../engine.ts";
import { Register } from "../register.ts";
import { Resolver } from "../types.ts";
import { SystemTypegraph } from "../system_typegraphs.ts";
import { TypeGraphDS } from "../typegraph.ts";
import { typegraph_validate } from "native";
import { ensure } from "../utils.ts";

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

  typegraphs: Resolver = ({ _: { info: { url } } }) => {
    return this.register.list().map((e) => {
      return {
        name: e.name,
        url: () => `${url.protocol}//${url.host}/${e.name}`,
      };
    });
  };

  typegraph: Resolver = ({ name, _: { info: { url } } }) => {
    const tg = this.register.get(name);
    if (!tg) {
      return null;
    }
    return {
      name: tg.name,
      url: `${url.protocol}//${url.host}/${tg.name}`,
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
    const json = await typegraph_validate({ json: fromString }).then((res) => {
      if ("Valid" in res) {
        return res.Valid.json;
      } else {
        return Promise.reject(
          new Error(`Invalid typegraph definition: ${res.NotValid.reason}`),
        );
      }
    });
    const name = (JSON.parse(json) as TypeGraphDS).types[0].title;

    if (SystemTypegraph.check(name)) {
      throw new Error(`Typegraph name ${name} cannot be used`);
    }

    const { typegraphName, messages, customData } = await this.register.set(
      json,
    );
    ensure(typegraphName == null || name === typegraphName, "unexpected");

    return { name, messages, customData: JSON.stringify(customData) };
  };

  removeTypegraph: Resolver = ({ name }) => {
    if (SystemTypegraph.check(name)) {
      throw new Error(`Typegraph ${name} cannot be removed`);
    }

    return this.register.remove(name);
  };
}
