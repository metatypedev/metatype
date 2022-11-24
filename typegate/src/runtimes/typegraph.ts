// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { TypeGraphDS, TypeMaterializer } from "../typegraph.ts";
import { TypeKind } from "graphql";
import { ensure } from "../utils.ts";
import { Runtime } from "./Runtime.ts";
import { ComputeStage } from "../engine.ts";
import {
  FunctionNode,
  isArray,
  isBoolean,
  isFunction,
  isInteger,
  isNumber,
  isObject,
  isOptional,
  isQuantifier,
  isString,
  ObjectNode,
  TypeNode,
} from "../type_node.ts";
import { Resolver, RuntimeConfig } from "../types.ts";

type DeprecatedArg = { includeDeprecated?: boolean };

export class TypeGraphRuntime extends Runtime {
  tg: TypeGraphDS;

  private constructor(tg: TypeGraphDS) {
    super();
    this.tg = tg;
  }

  static init(
    typegraph: TypeGraphDS,
    _materializers: TypeMaterializer[],
    _args: Record<string, unknown>,
    _config: RuntimeConfig,
  ): Runtime {
    return new TypeGraphRuntime(typegraph);
  }

  async deinit(): Promise<void> {}

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    const resolver: Resolver = (() => {
      const name = stage.props.materializer?.name;
      if (name === "getSchema") {
        return this.getSchema;
      }
      if (name === "getType") {
        return this.getType;
      }

      if (name === "resolver") {
        return async ({ _: { parent } }) => {
          const resolver = parent[stage.props.node];
          const ret = typeof resolver === "function"
            ? await resolver()
            : resolver;
          return ret;
        };
      }

      return async ({ _: { parent } }) => {
        const resolver = parent[stage.props.node];
        const ret = typeof resolver === "function"
          ? await resolver()
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

  getSchema: Resolver = () => {
    const root = this.tg.types[0] as ObjectNode;

    // const queriesBind: Record<string, number> = {};
    // const mutationsBind: Record<string, number> = {};

    const queries = this.tg.types[root.properties["query"]];
    const mutations = this.tg.types[root.properties["mutation"]];

    return {
      // https://github.com/graphql/graphql-js/blob/main/src/type/introspection.ts#L36
      description: () => `${root.type} typegraph`,
      types: () => {
        // FIXME prefer traversal
        const collectInputType = (
          type: TypeNode,
          history: Set<string> = new Set(),
        ): string[] => {
          if (history.has(type.title)) {
            return [];
          }
          if (isObject(type)) {
            history.add(type.title);
            return [
              type.title,
              ...Object.values(type.properties).flatMap((subTypeIdx) =>
                collectInputType(this.tg.types[subTypeIdx], history)
              ),
            ];
          }
          if (isArray(type)) {
            return collectInputType(
              this.tg.types[type.items],
              history,
            );
          }
          if (isOptional(type)) {
            return collectInputType(
              this.tg.types[type.item],
              history,
            );
          }
          return [];
        };

        const inputTypes = this.tg.types
          .filter((type) => isFunction(type))
          .flatMap((type) =>
            collectInputType(
              this.tg.types[(type as FunctionNode).input as number],
            )
          );

        return this.tg.types
          .slice(1) // pop root into query & mutation
          .concat(queries ? [queries] : [])
          .concat(mutations ? [mutations] : [])
          .filter((type) => {
            // filter non-native GraphQL types
            const isEnforced = type.injection ||
              (isObject(type) &&
                Object.values(type.properties)
                  .map((prop) => this.tg.types[prop])
                  .every((nested) => nested.injection));
            const isQuant = isQuantifier(type);
            const isInp = this.tg.types.some(
              (t) => (isFunction(t)) && this.tg.types[t.input] === type,
            );
            const isOutQuant = (isFunction(type)) &&
              isQuantifier(this.tg.types[type.output]);
            return !isQuant && !isInp && !isOutQuant && !isEnforced;
          })
          .map((type) => {
            const res = this.formatType(
              type,
              false,
              inputTypes.includes(type.title),
            );
            return res;
          });
      },
      queryType: () => {
        if (!queries) {
          return null;
        }
        return this.formatType(queries, false, false);
      },
      mutationType: () => {
        if (!mutations) {
          return null;
        }
        return this.formatType(mutations, false, false);
      },
      subscriptionType: () => null,
      directives: () => [],
    };
  };

  getType: Resolver = ({ name }) => {
    const type = this.tg.types.find((type) => type.title === name);
    return type ? this.formatType(type, false, false) : null;
  };

  formatInputFields = ([name, typeIdx]: [string, number]) => {
    const type = this.tg.types[typeIdx];

    if (
      type.injection ||
      (isObject(type) &&
        Object.values(type.properties)
          .map((prop) => this.tg.types[prop])
          .every((nested) => nested.injection))
    ) {
      return null;
    }

    return {
      // https://github.com/graphql/graphql-js/blob/main/src/type/introspection.ts#L374
      name: () => name,
      description: () => `${name} input field`,
      type: () => {
        const ret = this.formatType(type, true, true);
        return ret;
      },
      defaultValue: () => null,
      isDeprecated: () => false,
      deprecationReason: () => null,
    };
  };

  formatType = (
    type: TypeNode,
    required: boolean,
    asInput: boolean,
  ): Record<string, () => unknown> => {
    const common = {
      // https://github.com/graphql/graphql-js/blob/main/src/type/introspection.ts#L207
      name: () => null,
      specifiedByURL: () => null,
      // logic at https://github.com/graphql/graphql-js/blob/main/src/type/introspection.ts#L453-L490
      ofType: () => null,
      inputFields: () => null,
      fields: () => null,
      interfaces: () => null,
      possibleTypes: () => null,
      enumValues: () => null,
    };

    if (isOptional(type)) {
      const subtype = this.tg.types[type.item];
      return this.formatType(subtype, false, asInput);
    }

    if (required) {
      return {
        ...common,
        kind: () => TypeKind.NON_NULL,
        ofType: () => {
          return this.formatType(type, false, asInput);
        },
      };
    }

    if (isArray(type)) {
      return {
        ...common,
        kind: () => TypeKind.LIST,
        ofType: () => {
          const subtype = this.tg.types[type.items];
          return this.formatType(subtype, true, asInput);
        },
      };
    }

    if (isBoolean(type)) {
      return {
        ...common,
        kind: () => TypeKind.SCALAR,
        name: () => "Boolean",
        description: () => `${type.title} type`,
      };
    }

    if (isInteger(type)) {
      return {
        ...common,
        kind: () => TypeKind.SCALAR,
        name: () => "Int",
        description: () => `${type.title} type`,
      };
    }

    if (isNumber(type)) {
      return {
        ...common,
        kind: () => TypeKind.SCALAR,
        name: () => "Float", // TODO or Int??
        description: () => `${type.title} type`,
      };
    }

    if (isString(type)) {
      return {
        ...common,
        kind: () => TypeKind.SCALAR,
        name: () => "String",
        description: () => `${type.title} type`,
      };
    }

    if (isFunction(type)) {
      const output = this.tg.types[type.output as number];
      return this.formatType(output, false, false);
    }

    if (isObject(type)) {
      if (asInput) {
        return {
          ...common,
          kind: () => TypeKind.INPUT_OBJECT,
          name: () => `${type.title}Inp`,
          description: () => `${type.title} input type`,
          inputFields: () => {
            return Object.entries(type.properties).map(this.formatField(true));
          },
          interfaces: () => [],
        };
      } else {
        return {
          ...common,
          kind: () => TypeKind.OBJECT,
          name: () => type.title,
          description: () => `${type.title} type`,
          fields: () => {
            let entries = Object.entries(type.properties);
            if (Deno.env.get("TEST_ENV")) {
              entries = entries.sort((a, b) => b[1] - a[1]);
            }
            return entries.map(this.formatField(false));
          },
          interfaces: () => [],
        };
      }
    }

    throw Error(`unexpected type format ${(type as any).type}`);
    // interface: fields, interfaces, possibleTypes
    // union: possibleTypes
    // enum: enumValues
  };

  policyDescription(type: TypeNode): string {
    const policies = type.policies.map((p: number) => this.tg.policies[p].name);

    let ret = "\n\nPolicies:\n";

    if (policies.length > 0) {
      ret += policies.map((p: string) => `- ${p}`).join("\n");
    } else {
      ret += "- inherit";
    }

    return ret;
  }

  formatField = (asInput: boolean) => ([name, typeIdx]: [string, number]) => {
    const type = this.tg.types[typeIdx];
    const common = {
      // https://github.com/graphql/graphql-js/blob/main/src/type/introspection.ts#L329
      name: () => name,
      description: () => `${name} field${this.policyDescription(type)}`,
      isDeprecated: () => false,
      deprecationReason: () => null,
    };

    if (isFunction(type)) {
      return {
        ...common,
        args: (_: DeprecatedArg = {}) => {
          const inp = this.tg.types[type.input as number];
          ensure(
            isObject(inp),
            `${type} cannot be an input field, require struct`,
          );
          let entries = Object.entries((inp as ObjectNode).properties);
          if (Deno.env.get("TEST_ENV")) {
            entries = entries.sort((a, b) => b[1] - a[1]);
          }
          return entries
            .map(this.formatInputFields)
            .filter((f) => f !== null);
        },
        type: () => {
          const output = this.tg.types[type.output as number];
          return this.formatType(output, true, false);
        },
      };
    }

    return {
      ...common,
      args: () => [],
      type: () => {
        return this.formatType(type, true, asInput);
      },
    };
  };
}
