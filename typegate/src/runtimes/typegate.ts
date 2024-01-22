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
import { StringFormat } from "../typegraph/types.ts";

const logger = getLogger(import.meta);

interface ArgInfoResult {
  optional: boolean;
  as_id: boolean;
  title: string;
  type: string;
  runtime: string;
  /** list of json string */
  enum: string[] | null;
  /** json string */
  config: string | null;
  /** json string */
  default: string | null;
  /** json string */
  format: StringFormat | null;
  fields: Array<ObjectNodeResult> | null;
}

interface ObjectNodeResult {
  /** path starting from the parent node */
  subPath: Array<string>;
  termNode: ArgInfoResult;
}

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
      if (name === "removeTypegraphs") {
        return this.removeTypegraphs;
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
      if (name === "findListQueries") {
        return this.findListQueries;
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
    const { engine, response, name } = await this.typegate.pushTypegraph(
      tgJson,
      JSON.parse(secrets),
      true, // introspection
    );

    return {
      name: engine?.name ?? name,
      messages: response.messages,
      migrations: response.migrations,
      failure: response.failure && JSON.stringify(response.failure),
    };
  };

  removeTypegraphs: Resolver = async ({ names }) => {
    for (const name of names) {
      if (SystemTypegraph.check(name)) {
        throw new Error(`Typegraph ${name} cannot be removed`);
      }
      await this.typegate.register.remove(name);
    }
    return true;
  };

  argInfoByPath: Resolver = ({ typegraph, queryType, argPaths, fn }) => {
    if (queryType != "query" && queryType != "mutation") {
      throw new Error(
        `"query" or "mutation" expected, got type "${queryType}"`,
      );
    }

    const paths = argPaths as Array<Array<string>>;
    const tg = this.typegate.register.get(typegraph);

    const root = tg!.tg.type(0, Type.OBJECT).properties[queryType];
    const exposed = tg!.tg.type(root, Type.OBJECT).properties;

    const funcIdx = exposed[fn];
    if (funcIdx === undefined) {
      const available = Object.keys(exposed);
      const closest = closestWord(fn, available, true);
      const propositions = closest ? [closest] : available;
      const prefix = propositions.length > 1 ? " one of " : " ";
      throw new Error(
        `type named "${fn}" not found, did you mean${prefix}${
          propositions
            .map((prop) => `"${prop}"`)
            .join(", ")
        }?`,
      );
    }

    const func = tg!.tg.type(funcIdx, Type.FUNCTION);
    const input = tg!.tg.type(func.input, Type.OBJECT);

    return paths.map((path) => walkPath(tg!.tg, input, 0, path));
  };

  findListQueries: Resolver = ({ typegraph }) => {
    const tg = this.typegate.register.get(typegraph);

    const root = tg!.tg.type(0, Type.OBJECT).properties.query;
    const exposed = tg!.tg.type(root, Type.OBJECT).properties;

    return Object.entries(exposed).map(([name, idx]) => {
      const func = tg!.tg.type(idx, Type.FUNCTION);
      const input = tg!.tg.type(func.input, Type.OBJECT);
      const inputs = input.properties;
      const output = tg!.tg.type(func.output);
      if (output.type != Type.LIST) {
        return null;
      }
      const outputItem = tg!.tg.type(output.items);
      if (outputItem.type != Type.OBJECT) {
        return null;
      }

      return {
        name,
        inputs: Object.keys(inputs).map((name) => {
          return {
            name,
            type: walkPath(tg!.tg, input, 0, [name]),
          };
        }),
        output: walkPath(tg!.tg, output, 0, []),
        outputItem: walkPath(tg!.tg, outputItem, 0, []),
      };
    }).filter((e) => e != null);
  };
}

function resolveOptional(tg: TypeGraph, node: TypeNode) {
  let topLevelDefault;
  let isOptional = false;
  if (node.type == Type.OPTIONAL) {
    while (node.type == Type.OPTIONAL) {
      if (topLevelDefault == undefined) {
        topLevelDefault = node.default_value;
      }
      isOptional = true;
      node = tg.type(node.item);
    }
  }
  const format = node.type == Type.STRING ? node.format : undefined;
  return { node, format, topLevelDefault, isOptional };
}

function collectObjectFields(
  tg: TypeGraph,
  parent: TypeNode,
): Array<ObjectNodeResult> {
  // first generate all possible paths

  const paths = [] as Array<Array<string>>;
  const traversed = new Set();

  const collectAllPaths = (
    parent: TypeNode,
    currentPath: Array<string> = [],
  ): void => {
    const node = resolveOptional(tg, parent).node;

    if (node.type == Type.OBJECT) {
      if (traversed.has(node.title)) {
        return;
      }
      traversed.add(node.title);
      for (const [keyName, fieldIdx] of Object.entries(node.properties)) {
        collectAllPaths(tg.type(fieldIdx), [...currentPath, keyName]);
      }
      return;
    }

    // leaf
    // TODO: either/union?
    paths.push(currentPath);
  };

  collectAllPaths(parent);

  return paths.map((path) => ({
    subPath: path,
    termNode: walkPath(tg, parent, 0, path),
  }));
}

function walkPath(
  tg: TypeGraph,
  parent: TypeNode,
  startCursor: number,
  path: Array<string>,
): ArgInfoResult {
  let node = parent as TypeNode;
  for (let cursor = startCursor; cursor < path.length; cursor += 1) {
    const current = path.at(cursor)!;

    // if the type is optional and path has not ended yet, the wrapped type needs to be retrieved
    node = resolveOptional(tg, node).node;

    const prettyPath = path.map((chunk, i) =>
      i == cursor ? `[${chunk}]` : chunk
    ).join(".");

    switch (node.type) {
      case Type.OBJECT: {
        const available = Object.keys(node.properties);
        const currNodeIdx = node.properties[current];

        if (currNodeIdx === undefined) {
          throw new Error(
            `invalid path ${prettyPath}, none of ${
              available.join(", ")
            } match the chunk "${current}"`,
          );
        }

        node = tg.type(currNodeIdx);
        break;
      }
      case Type.EITHER:
      case Type.UNION: {
        const variantsIdx = "anyOf" in node ? node.anyOf : node.oneOf;
        const failures = new Array(variantsIdx.length);
        // try to expand each variant, return first compatible with the path
        const compat = [];
        for (let i = 0; i < variantsIdx.length; i += 1) {
          const variant = tg.type(variantsIdx[i]);
          try {
            compat.push(walkPath(tg, variant, cursor, path));
          } catch (err) {
            failures[i] = err;
          }
        }
        if (compat.length == 0) {
          throw failures.shift();
        }
        return compat.shift()!;
      }
      default: {
        // optional, list, float are considered as leaf
        if (cursor != path.length) {
          throw new Error(
            `cannot extend path ${prettyPath} with type "${node.type}"`,
          );
        }
        break;
      }
    }
  }

  // resulting leaf can be optional
  // in that case isOptional is true
  const {
    node: resNode,
    format,
    topLevelDefault: defaultValue,
    isOptional,
  } = resolveOptional(
    tg,
    node,
  );
  node = resNode;

  return {
    optional: isOptional,
    as_id: node.as_id,
    title: node.title,
    type: node.type,
    enum: node.enum ?? null,
    runtime: tg.runtime(node.runtime).name,
    config: node.config ? JSON.stringify(node.config) : null,
    default: defaultValue ? JSON.stringify(defaultValue) : null,
    format: format ?? null,
    fields: node.type == "object" ? collectObjectFields(tg, parent) : null,
  };
}
