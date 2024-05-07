// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "./Runtime.ts";
import { ComputeStage } from "../engine/query_engine.ts";
import { Resolver, ResolverArgs } from "../types.ts";
import { SystemTypegraph } from "../system_typegraphs.ts";
import { getLogger } from "../log.ts";
import config from "../config.ts";
import * as semver from "std/semver/mod.ts";
import { Typegate } from "../typegate/mod.ts";
import { TypeGraph } from "../typegraph/mod.ts";
import { closestWord } from "../utils.ts";
import { Type, TypeNode } from "../typegraph/type_node.ts";
import { StringFormat } from "../typegraph/types.ts";
import { mapValues } from "std/collections/map_values.ts";
import { applyPostProcessors } from "../postprocess.ts";
import { PrismaRT, PrismaRuntime } from "./prisma/mod.ts";
import { SingleQuery } from "./prisma/prisma.ts";

const logger = getLogger(import.meta);

interface TypeInfo {
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
  policies: Array<string | Record<string, string | null>>;
}

interface ObjectNodeResult {
  /** path starting from the parent node */
  subPath: Array<string>;
  termNode: TypeInfo;
}

// https://github.com/prisma/prisma-engines/blob/93f79ec1ca7867558f10130d8db84fb7bf150357/query-engine/request-handlers/src/protocols/json/body.rs#L50
interface PrismaSingleQuery {
  modelName?: string;
  action: string;
  query: string; // JSON stringified - until we have a proper type for the typegraph
}

interface PrismaBatchQuery {
  batch: PrismaSingleQuery[];
  transaction?: {
    isolationLevel?: string;
  };
}

type PrismaQuery = PrismaSingleQuery | PrismaBatchQuery;

const getQueryObject = (
  { modelName, action, query }: PrismaSingleQuery,
): SingleQuery => {
  return {
    modelName,
    action,
    query: JSON.parse(query),
  };
};

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
      switch (name) {
        case "addTypegraph":
          return this.addTypegraph;
        case "removeTypegraphs":
          return this.removeTypegraphs;
        case "typegraphs":
          return this.typegraphs;
        case "typegraph":
          return this.typegraph;
        case "serializedTypegraph":
          return this.serializedTypegraph;
        case "argInfoByPath":
          return this.argInfoByPath;
        case "findAvailableOperations":
          return this.findAvailableOperations;
        case "findPrismaModels":
          return this.findPrismaModels;
        case "execRawPrismaQuery":
          return this.execRawPrismaQuery;
        case "queryPrismaModel":
          return this.queryPrismaModel;

        default:
          if (name != null) {
            throw new Error(`materializer '${name}' not implemented`);
          }

          return async ({ _: { parent }, ...args }) => {
            const resolver = parent[stage.props.node];
            const ret = typeof resolver === "function"
              ? await resolver(args)
              : resolver;
            return ret;
          };
      }
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

  addTypegraph: Resolver = async ({ fromString, secrets, targetVersion }) => {
    logger.info("Adding typegraph");
    if (
      !semver.greaterOrEqual(
        semver.parse(targetVersion),
        semver.parse(config.version),
      )
    ) {
      throw new Error(
        `Typegraph SDK version ${targetVersion} must be greater than typegate version ${config.version} (until the releases are stable)`,
      );
    }

    const tgJson = await TypeGraph.parseJson(fromString);
    applyPostProcessors([tgJson]);

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
      await this.typegate.removeTypegraph(name);
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

  findAvailableOperations: Resolver = ({ typegraph }) => {
    // TODO filter
    const tg = this.typegate.register.get(typegraph);

    const root = tg!.tg.type(0, Type.OBJECT).properties.query;
    const exposed = tg!.tg.type(root, Type.OBJECT).properties;

    return Object.entries(exposed).map(([name, idx]) => {
      const func = tg!.tg.type(idx, Type.FUNCTION);

      const inputType = tg!.tg.type(func.input, Type.OBJECT);
      const inputs = Object.keys(inputType.properties).map((name) => ({
        name,
        type: walkPath(tg!.tg, inputType, 0, [name]),
      }));

      const outputType = tg!.tg.type(func.output);
      const output = walkPath(tg!.tg, outputType, 0, []);
      let outputItem: TypeInfo | null = null;
      if (outputType.type == Type.LIST) {
        outputItem = walkPath(tg!.tg, tg!.tg.type(outputType.items), 0, []);
      }

      const materializer = tg!.tg.materializer(func.materializer);
      const type = [null, "read"].includes(materializer.effect.effect as string)
        ? "query"
        : "mutation";

      return {
        name,
        type,
        inputs,
        output,
        outputItem,
      };
    });
  };

  findPrismaModels: Resolver = ({ typegraph }) => {
    const tg = this.typegate.register.get(typegraph)!.tg;

    const prismaRuntimes = tg.tg.runtimes.filter(
      (rt) => rt.name == "prisma",
    );

    return prismaRuntimes.map((rt) => {
      const rtData = rt.data as PrismaRT.DataFinal;
      return rtData.models.map((model) => {
        return {
          name: model.typeName,
          runtime: rtData.name,
          fields: model.props.map((prop) => {
            return {
              name: prop.key,
              type: walkPath(tg, tg.type(prop.typeIdx), 0, []),
            };
          }),
        };
      });
    }).flat();
  };

  execRawPrismaQuery: Resolver = async (args) => {
    const { typegraph, runtime, query } = args as ResolverArgs<
      { typegraph: string; runtime: string; query: PrismaQuery }
    >;
    const engine = this.typegate.register.get(typegraph);
    if (!engine) {
      throw new Error("typegate engine not found");
    }
    const runtimeIdx = engine.tg.tg.runtimes.findIndex(
      (rt) => rt.name === "prisma" && rt.data.name === runtime,
    );
    if (runtimeIdx === -1) {
      throw new Error(`prisma runtime '${runtime}' not found`);
    }
    const rt = engine.tg.runtimeReferences[runtimeIdx] as PrismaRuntime;

    const isBatch = "batch" in query;

    const queryObj = isBatch
      ? { ...query, batch: query.batch.map(getQueryObject) }
      : getQueryObject(query);

    const result = await rt.query(queryObj);

    const queries = isBatch ? query.batch : [query];
    const resultValues =
      ((isBatch ? result : [result]) as Array<Record<string, unknown>>)
        .map((r, i) => {
          const q = queries[i];
          const key = q.action + q.modelName ?? "";
          return r[key];
        });

    return JSON.stringify(isBatch ? resultValues : resultValues[0]);
  };

  queryPrismaModel: Resolver = async (
    { typegraph, runtime, model, offset, limit },
  ) => {
    const engine = this.typegate.register.get(typegraph);
    if (!engine) {
      throw new Error(`typegraph not found: ${typegraph}`);
    }
    const runtimeIdx = engine.tg.tg.runtimes.findIndex(
      (rt) => rt.name === "prisma" && rt.data.name === runtime,
    );
    if (runtimeIdx === -1) {
      throw new Error(`prisma runtime '${runtime}' not found`);
    }
    const rtData = engine.tg.tg.runtimes[runtimeIdx].data as PrismaRT.DataFinal;
    const rt = engine.tg.runtimeReferences[runtimeIdx] as PrismaRuntime;
    const modelData = rtData.models.find((m) => m.typeName === model);
    if (!modelData) {
      throw new Error(
        `prisma model '${model}' not found in the runtime '${runtime}'`,
      );
    }

    const fields = modelData.props.map((prop) => ({
      name: prop.key,
      type: walkPath(engine.tg, engine.tg.type(prop.typeIdx), 0, []),
    }));

    const selection: Record<string, boolean> = {};
    for (const field of fields) {
      if (field.type == null) {
        continue;
      }
      if (
        ["integer", "float", "boolean", "string"].includes(field.type.type)
      ) {
        selection[field.name] = true;
      }
    }

    const data = await rt.query({
      batch: [
        {
          modelName: model,
          action: "aggregate",
          query: {
            selection: {
              _count: {
                selection: {
                  _all: true,
                },
              },
            },
          },
        },
        {
          modelName: model,
          action: "findMany",
          query: {
            selection,
            arguments: {
              skip: offset,
              take: limit,
            },
          },
        },
      ],
    });

    return {
      fields,
      rowCount: data[0][`aggregate${model}`]._count._all,
      data: data[1][`findMany${model}`].map((r: unknown) => JSON.stringify(r)),
    };
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

  return paths.map((path) => {
    const termNode = walkPath(tg, parent, 0, path);
    if (termNode == null) return null;
    return {
      subPath: path,
      termNode,
    };
  }).filter((e) => e != null) as Array<ObjectNodeResult>;
}

function walkPath(
  tg: TypeGraph,
  parent: TypeNode,
  startCursor: number,
  path: Array<string>,
): TypeInfo | null {
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
    // TODO enum type on typegraph typegate.py
    policies: node.policies.map((policy) => {
      if (typeof policy === "number") {
        return JSON.stringify(tg.policy(policy).name);
      }
      return JSON.stringify(
        mapValues(policy as Record<string, number>, (value: number) => {
          if (value === null) {
            return null;
          }
          return tg.policy(value).name;
        }),
      );
    }),
  };
}
