// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "./Runtime.ts";
import { ComputeStage } from "../engine/query_engine.ts";
import { Resolver } from "../types.ts";
import { SystemTypegraph } from "../system_typegraphs.ts";
import { getLogger } from "../log.ts";
import config from "../config.ts";
import * as semver from "std/semver/mod.ts";
import { Typegate } from "../typegate/mod.ts";
import { TypeGraph } from "../typegraph/mod.ts";
import { closestWord } from "../utils.ts";
import { Type, TypeNode } from "../typegraph/type_node.ts";

const logger = getLogger(import.meta);

export class TypeGateRuntime extends Runtime {
  static singleton: TypeGateRuntime | null = null;

  private constructor(
    private typegate: Typegate,
  ) {
    super("system");
  }

  static init(typegate: Typegate): TypeGateRuntime {
    if (!TypeGateRuntime.singleton) {
      TypeGateRuntime.singleton = new TypeGateRuntime(typegate);
    }
    return TypeGateRuntime.singleton;
  }

  deinit(): Promise<void> {
    TypeGateRuntime.singleton = null;
    return Promise.resolve();
  }

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
      if (name === "argInfoByPath") {
        return this.argInfoByPath;
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
    return this.typegate.register.list().map((e) => {
      return {
        name: e.name,
        url: () => `${url.protocol}//${url.host}/${e.name}`,
      };
    });
  };

  typegraph: Resolver = ({ name, _: { info: { url } } }) => {
    const tg = this.typegate.register.get(name);
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
    const tg = this.typegate.register.get(typegraph.name as string);
    if (!tg) {
      return null;
    }

    return JSON.stringify(tg.tg.tg);
  };

  addTypegraph: Resolver = async ({ fromString, secrets, cliVersion }) => {
    logger.info("Adding typegraph");
    if (!semver.gte(semver.parse(cliVersion), semver.parse(config.version))) {
      throw new Error(
        `Meta CLI version ${cliVersion} must be greater than typegate version ${config.version} (until the releases are stable)`,
      );
    }

    const tgJson = await TypeGraph.parseJson(fromString);
    const [engine, pushResponse] = await this.typegate.pushTypegraph(
      tgJson,
      JSON.parse(secrets),
      true, // introspection
    );

    return {
      name: engine.name,
      messages: pushResponse.messages,
      migrations: pushResponse.migrations,
      resetRequired: pushResponse.resetRequired,
    };
  };

  removeTypegraph: Resolver = ({ name }) => {
    if (SystemTypegraph.check(name)) {
      throw new Error(`Typegraph ${name} cannot be removed`);
    }

    return this.typegate.register.remove(name);
  };

  argInfoByPath: Resolver = ({ typegraph, queryType, argPaths, fn }) => {
    if (queryType != "query" && queryType != "mutation") {
      throw new Error(`type "${queryType}", "query" or "mutation" expected`);
    }

    const paths = argPaths as Array<Array<string>>;
    const tg = this.typegate.register.get(typegraph);

    const root = tg!.tg.type(0, Type.OBJECT).properties[queryType];
    const exposed = tg!.tg.type(root, Type.OBJECT).properties;

    const funcIdx = exposed[fn];
    if (funcIdx === undefined) {
      const available = Object.keys(exposed);
      const proposition = closestWord(fn ?? "", available, true);
      console.log("ava", available, JSON.stringify(exposed));
      throw new Error(
        `type named "${fn}" not found, did you mean "${proposition ?? ""}"`,
      );
    }

    const func = tg!.tg.type(funcIdx, Type.FUNCTION);
    const input = tg!.tg.type(func.input, Type.OBJECT);

    const walkPath = (path: Array<string>) => {
      let node = input as TypeNode;
      let defaultValue;
      for (let cursor = 0; cursor < path.length; cursor += 1) {
        const current = path.at(cursor)!;

        // resolve nested optional & current default value
        let topLevelDefault;
        if (node.type == Type.OPTIONAL) {
          while (node.type == Type.OPTIONAL) {
            if (topLevelDefault == undefined) {
              topLevelDefault = node.default_value;
            }
            node = tg!.tg.type(node.item);
          }
          defaultValue = topLevelDefault;
        }

        const prettyPath = path.map((chunk, i) =>
          i == cursor ? `[${chunk}]` : chunk
        ).join(".");

        switch (node.type) {
          case Type.OBJECT: {
            const available = Object.keys(node.properties);
            const currNode = node.properties[current];

            if (currNode === undefined) {
              throw new Error(
                `invalid path ${prettyPath}, none of ${
                  available.join(", ")
                } match the chunk "${current}"`,
              );
            }

            node = tg!.tg.type(currNode);

            // reset, path is not terminated yet!
            defaultValue = null;
            break;
          }
          default: {
            // list, float, either, ..etc are considered as leaf
            if (cursor != path.length) {
              throw new Error(
                `cannot extend path ${prettyPath} with type "${node.type}"`,
              );
            }
            break;
          }
        }
      }

      return {
        as_id: node.as_id,
        title: node.title,
        type: node.type,
        enums: node.enum,
        runtime: tg!.tg.runtime(node.runtime).name,
        config: node.config ? JSON.stringify(node.config) : null,
        default: defaultValue ? JSON.stringify(defaultValue) : null,
      };
    };

    return paths.map((path) => walkPath(path));
  };
}
