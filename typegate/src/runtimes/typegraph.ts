// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { TypeGraphDS, TypeMaterializer } from "../typegraph.ts";
import { TypeKind } from "graphql";
import { ensure } from "../utils.ts";
import { Runtime } from "./Runtime.ts";
import { ComputeStage } from "../engine.ts";
import {
  isArray,
  isFunction,
  isObject,
  isOptional,
  isQuantifier,
  isScalar,
  ObjectNode,
  Type,
  TypeNode,
} from "../type_node.ts";
import { Resolver } from "../types.ts";
import {
  getChildTypes,
  TypeVisitorMap,
  visitType,
  visitTypes,
} from "../typegraph/visitor.ts";
import { distinctBy } from "std/collections/distinct_by.ts";
import { isInjected } from "../typegraph/utils.ts";

type DeprecatedArg = { includeDeprecated?: boolean };

const SCALAR_TYPE_MAP = {
  "boolean": "Boolean",
  "integer": "Int",
  "number": "Float",
  "string": "String",
};

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

    const queries = this.tg.types[root.properties["query"]] as ObjectNode;
    const mutations = this.tg.types[root.properties["mutation"]] as ObjectNode;

    return {
      // https://github.com/graphql/graphql-js/blob/main/src/type/introspection.ts#L36
      description: () => `${root.type} typegraph`,
      types: () => {
        // filter non-native GraphQL types
        const filter = (type: TypeNode) => {
          return !isInjected(this.tg, type) && !isQuantifier(type);
        };

        const scalarTypeIndices = new Set<number>();
        const inputTypeIndices = new Set<number>();
        const regularTypeIndices = new Set<number>();

        const myVisitor: TypeVisitorMap = {
          [Type.FUNCTION]: ({ type }) => {
            // the struct input of a function never generates a GrahpQL type
            // the actual inputs are the properties
            visitTypes(
              this.tg,
              getChildTypes(this.tg.types[type.input]),
              ({ type, idx }) => {
                if (isScalar(type)) {
                  scalarTypeIndices.add(idx);
                  return false;
                }
                if (filter(type)) {
                  inputTypeIndices.add(idx);
                }
                return true;
              },
            );

            visitType(this.tg, type.output, myVisitor);
            return false;
          },
          default: ({ type, idx }) => {
            if (isScalar(type)) {
              scalarTypeIndices.add(idx);
              return false;
            }
            if (filter(type)) {
              regularTypeIndices.add(idx);
            }
            return true;
          },
        };

        visitTypes(this.tg, getChildTypes(this.tg.types[0]), myVisitor);

        const scalarTypes = distinctBy(
          [...scalarTypeIndices].map((idx) => this.tg.types[idx]),
          (t) => t.type, // for scalars: one GraphQL type per `type` not `title`
        ).map((type) => this.formatType(type, false, false));
        const regularTypes = distinctBy(
          [...regularTypeIndices].map((idx) => this.tg.types[idx]),
          (t) => t.title,
        ).map((type) => this.formatType(type, false, false));
        const inputTypes = distinctBy(
          [...inputTypeIndices].map((idx) => this.tg.types[idx]),
          (t) => t.title,
        ).map((type) => this.formatType(type, false, true));

        const types = [...scalarTypes, ...regularTypes, ...inputTypes];
        return types;
      },
      queryType: () => {
        if (!queries || Object.values(queries.properties).length === 0) {
          return null;
        }
        return this.formatType(queries, false, false);
      },
      mutationType: () => {
        if (!mutations || Object.values(mutations.properties).length === 0) {
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

    if (isScalar(type)) {
      return {
        ...common,
        kind: () => TypeKind.SCALAR,
        name: () => SCALAR_TYPE_MAP[type.type],
        description: () => `${type.type} type`,
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
            return Object.entries(type.properties).map(
              this.formatField(true),
            );
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
            entries = entries.sort((a, b) => b[1] - a[1]);
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
          entries = entries.sort((a, b) => b[1] - a[1]);
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
