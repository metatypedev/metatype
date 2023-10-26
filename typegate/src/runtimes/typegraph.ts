// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { TypeGraph, TypeGraphDS, TypeMaterializer } from "../typegraph/mod.ts";
import { TypeKind } from "graphql";
import { ensure } from "../utils.ts";
import { Runtime } from "./Runtime.ts";
import { ComputeStage } from "../engine/query_engine.ts";
import {
  isEither,
  isFunction,
  isList,
  isObject,
  isOptional,
  isQuantifier,
  isScalar,
  isUnion,
  ObjectNode,
  Type,
  TypeNode,
} from "../typegraph/type_node.ts";
import { Resolver } from "../types.ts";
import {
  getChildTypes,
  TypeVisitorMap,
  visitTypes,
} from "../typegraph/visitor.ts";
import { distinctBy } from "std/collections/distinct_by.ts";
import { isInjected } from "../typegraph/utils.ts";
import { PolicyIndices } from "../typegraph/types.ts";

type DeprecatedArg = { includeDeprecated?: boolean };

const SCALAR_TYPE_MAP = {
  "boolean": "Boolean",
  "integer": "Int",
  "float": "Float",
  "string": "String",
  "file": "File",
};

function generateCustomScalar(type: TypeNode, idx: number) {
  if (isScalar(type)) {
    const id = type.type;
    return {
      title: `_${id[0].toUpperCase()}${id.slice(1)}`,
      type: "object",
      properties: {
        [id]: idx,
      },
    } as ObjectNode;
  }
  throw `"${type.title}" of type "${type.type}" is not a scalar`;
}

export class TypeGraphRuntime extends Runtime {
  tg: TypeGraphDS;
  private scalarIndex = new Map<string, number>();

  private constructor(tg: TypeGraphDS) {
    super(TypeGraph.formatName(tg));
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

        const inputRootTypeIndices = new Set<number>();
        const outputRootTypeIndices = new Set<number>();
        // decides whether or not custom object should be generated
        let hasUnion = false;

        const myVisitor: TypeVisitorMap = {
          [Type.FUNCTION]: ({ type }) => {
            // TODO skip if policy check fails
            // https://metatype.atlassian.net/browse/MET-119

            // the struct input of a function never generates a GrahpQL type
            // the actual inputs are the properties
            inputRootTypeIndices.add(type.input);
            outputRootTypeIndices.add(type.output);
            visitTypes(
              this.tg,
              getChildTypes(this.tg.types[type.input]),
              ({ type, idx }) => {
                hasUnion ||= isUnion(type) || isEither(type);
                if (isScalar(type)) {
                  scalarTypeIndices.add(idx);
                  this.scalarIndex.set(type.type, idx);
                  return false;
                }
                if (filter(type)) {
                  inputTypeIndices.add(idx);
                }
                return true;
              },
            );
            return true;
          },
          default: ({ type, idx }) => {
            if (
              inputRootTypeIndices.has(idx) &&
              !outputRootTypeIndices.has(idx)
            ) {
              return false;
            }
            // type is either a regular type or an input type reused in the output
            hasUnion ||= isUnion(type) || isEither(type);
            if (isScalar(type)) {
              scalarTypeIndices.add(idx);
              this.scalarIndex.set(type.type, idx);
              return false;
            }
            if (filter(type)) {
              regularTypeIndices.add(idx);
            }
            return true;
          },
        };

        visitTypes(this.tg, getChildTypes(this.tg.types[0]), myVisitor);
        const distinctScalars = distinctBy(
          [...scalarTypeIndices].map((idx) => this.tg.types[idx]),
          (t) => t.type, // for scalars: one GraphQL type per `type` not `title`
        );
        const scalarTypes = distinctScalars.map((type) =>
          this.formatType(type, false, false)
        );

        const customScalarTypes = hasUnion
          ? distinctScalars.map((node) => {
            const idx = this.scalarIndex.get(node.type)!;
            const asObject = generateCustomScalar(node, idx);
            return this.formatType(asObject, false, false);
          })
          : [];

        const regularTypes = distinctBy(
          [...regularTypeIndices].map((idx) => this.tg.types[idx]),
          (t) => t.title,
        ).map((type) => this.formatType(type, false, false));

        const inputTypes = distinctBy(
          [...inputTypeIndices].map((idx) => this.tg.types[idx]),
          (t) => t.title,
        ).map((type) => this.formatType(type, false, true));

        const types = [
          ...scalarTypes,
          ...customScalarTypes,
          ...regularTypes,
          ...inputTypes,
        ];

        this.scalarIndex.clear();
        return types;
      },
      queryType: () => {
        if (!queries || Object.values(queries.properties).length === 0) {
          // https://github.com/graphql/graphiql/issues/2308 (3x) enforce to keep empty Query type
          return this.formatType(queries, false, false);
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

    if (isList(type)) {
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
      if (type.title === "Query" && Object.keys(type.properties).length === 0) {
        // https://github.com/graphql/graphiql/issues/2308 (3x) enforce to keep empty Query type
        return {
          ...common,
          kind: () => TypeKind.OBJECT,
          name: () => "Query",
          description: () => `${type.title} type`,
          fields: () => [{
            name: () => "_",
            args: () => [],
            type: () =>
              this.formatType(
                this.tg
                  .types[(this.tg.types[0] as ObjectNode).properties["query"]], // itself
                false,
                false,
              ),
            isDeprecated: () => true,
            deprecationReason: () =>
              "Dummy value due to https://github.com/graphql/graphiql/issues/2308",
          }],
          interfaces: () => [],
        };
      }

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

    // Issue:
    // Translate union (anyOf) / either (oneOf) to Graphql types that behave the same way
    // - Current graphql spec does not allow UNION types on the input (yet)
    // - UNION types does not support scalars, only objects
    // Current solution:
    // - input: translate either/union nodes to a custom scalar
    // - output: translate either/union nodes to graphql UNION
    //  * caveat: since UNION does not allow scalar variants, we have to translate them
    //    to custom graphql objects
    // Alternative ?
    // https://github.com/graphql/graphql-spec/pull/825
    if (isEither(type) || isUnion(type)) {
      const variants = isUnion(type) ? type.anyOf : type.oneOf;
      if (asInput) {
        const titles = new Set<string>(
          variants.map((idx) => this.tg.types[idx].title),
        );
        const description = `${type.type} type\n${
          Array.from(titles).join(", ")
        }`;

        return {
          ...common,
          kind: () => TypeKind.SCALAR,
          name: () => `${type.title}In`,
          description: () => description,
        };
      } else {
        return {
          ...common,
          kind: () => TypeKind.UNION,
          name: () => `${type.title}Out`,
          description: () => `${type.title} type`,
          possibleTypes: () => {
            return variants.map((idx) => {
              const variant = this.tg.types[idx];
              if (isScalar(variant)) {
                const idx = this.scalarIndex.get(variant.type)!;
                const asObject = generateCustomScalar(variant, idx);
                return this.formatType(asObject, false, false);
              } else {
                return this.formatType(variant, false, false);
              }
            });
          },
        };
      }
    }

    throw Error(`unexpected type format ${(type as any).type}`);
    // interface: fields, interfaces, possibleTypes
    // union: possibleTypes
    // enum: enumValues
  };

  policyDescription(type: TypeNode): string {
    const describeOne = (p: number) => this.tg.policies[p].name;
    const describe = (p: PolicyIndices) => {
      if (typeof p === "number") {
        return describeOne(p);
      }
      return Object.entries(p).map(
        ([eff, polIdx]) => `${eff}:${describeOne(polIdx)}`,
      ).join("; ");
    };
    const policies = type.policies.map(describe);

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
