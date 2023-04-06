// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { TypeGraphDS, TypeMaterializer } from "../typegraph.ts";
import { TypeKind } from "graphql";
import { ensure } from "../utils.ts";
import { Runtime } from "./Runtime.ts";
import { ComputeStage } from "../engine.ts";
import {
  isArray,
  isEither,
  isFunction,
  isObject,
  isOptional,
  isQuantifier,
  isScalar,
  isUnion,
  ObjectNode,
  Type,
  TypeNode,
} from "../type_node.ts";
import { Resolver } from "../types.ts";
import {
  getChildTypes,
  TypeVisitorMap,
  visitTypes,
} from "../typegraph/visitor.ts";
import { distinctBy } from "std/collections/distinct_by.ts";
import { isInjected } from "../typegraph/utils.ts";
import { PolicyIndices } from "../types/typegraph.ts";

type DeprecatedArg = { includeDeprecated?: boolean };

const SCALAR_TYPE_MAP = {
  "boolean": "Boolean",
  "integer": "Int",
  "number": "Float",
  "string": "String",
};

function generateCustomScalarName(type: TypeNode) {
  if (isScalar(type)) {
    const id = type.type;
    // We get "Expected {name} to be a GraphQL Object type."
    // without the "_" prefix
    return "_" + id[0].toUpperCase() + id.slice(1);
  }
  throw `"${type.title}" of type "${type.type}" is not a scalar`;
}

export class TypeGraphRuntime extends Runtime {
  tg: TypeGraphDS;
  private scalarIndex = new Map<string, number>();
  private customScalars = new Map<string, ObjectNode>();

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

        const inputRootTypeIndices = new Set<number>();

        const myVisitor: TypeVisitorMap = {
          [Type.FUNCTION]: ({ type }) => {
            // TODO skip if policy check fails
            // https://metatype.atlassian.net/browse/MET-119

            // the struct input of a function never generates a GrahpQL type
            // the actual inputs are the properties
            inputRootTypeIndices.add(type.input);
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

            return true;
          },
          default: ({ type, idx }) => {
            if (inputRootTypeIndices.has(idx)) {
              return false;
            }
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
        const distinctScalars = distinctBy(
          [...scalarTypeIndices].map((idx) => {
            const node = this.tg.types[idx];
            this.scalarIndex.set(node.type, idx);
            return node;
          }),
          (t) => t.type, // for scalars: one GraphQL type per `type` not `title`
        );
        const scalarTypes = distinctScalars.map((type) =>
          this.formatType(type, false, false)
        );
        const customScalarTypes = distinctScalars.map((node) => {
          const key = generateCustomScalarName(node);
          const custom = {
            title: key,
            type: "object",
            properties: {
              [node.type]: this.scalarIndex.get(node.type),
            },
          } as ObjectNode;
          this.customScalars.set(key, custom);
          return this.formatType(custom, false, false);
        });
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
          name: () => type.title,
          description: () => description,
        };
      } else {
        return {
          ...common,
          kind: () => TypeKind.UNION,
          name: () => type.title,
          description: () => `${type.title} type`,
          possibleTypes: () => {
            return variants.map((idx) => {
              const variant = this.tg.types[idx];
              if (isScalar(variant)) {
                const key = generateCustomScalarName(variant);
                const variantsAsObject = this.customScalars.get(key);
                if (variantsAsObject) {
                  return this.formatType(variantsAsObject, false, false);
                } else {
                  throw Error(`custom scalar "${key}" does not exist`);
                }
              }
              return this.formatType(variant, false, false);
            });
          },
        };
        // const variantsAsObject = {
        //   title: type.title,
        //   type: "object",
        //   properties: {},
        // } as ObjectNode;
        // let count = 0;
        // const objects = new Set<[string, number]>();
        // const remaining = new Set<[string, number]>();
        // for (let i = 0; i < variants.length; i++) {
        //   const idx = variants[i];
        //   const node = this.tg.types[idx];
        //   if (isObject(node)) {
        //     for (const [field, idx] of Object.entries(node.properties)) {
        //       objects.add([field, idx]);
        //     }
        //   } else {
        //     // name for scalars and nested union/either
        //     const field = `${type.type}_${count++}`;
        //     remaining.add([field, idx]);
        //   }
        // }

        // for (const [field, idx] of objects) {
        //   variantsAsObject.properties[field] = idx;
        // }
        // for (const [field, idx] of remaining) {
        //   variantsAsObject.properties[field] = idx;
        // }
        // return this.formatType(variantsAsObject, required, asInput);
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
