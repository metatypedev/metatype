import { TypeGraphDS, TypeMaterializer, TypeNode } from "../typegraph.ts";
import { TypeKind } from "graphql";
import * as ast from "graphql_ast";
import { ensure } from "../utils.ts";
import { Resolver, Runtime, RuntimeConfig } from "./Runtime.ts";
import { ComputeStage } from "../engine.ts";
import { FuncNode, StructNode } from "../type-node.ts";

type DeprecatedArg = { includeDeprecated?: boolean };

export class TypeGraphRuntime extends Runtime {
  tg: TypeGraphDS;

  private constructor(tg: TypeGraphDS) {
    super();
    this.tg = tg;
  }

  static init(
    typegraph: TypeGraphDS,
    materializers: TypeMaterializer[],
    args: Record<string, unknown>,
    config: RuntimeConfig,
  ): Runtime {
    return new TypeGraphRuntime(typegraph);
  }

  async deinit(): Promise<void> {}

  materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    verbose: boolean,
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
          const ret = await resolver();
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

  getSchema = () => {
    const root = this.tg.types[0] as StructNode;

    const queriesBind: Record<string, number> = {};
    const mutationsBind: Record<string, number> = {};

    for (
      const [exposedName, exposedTypeIdx] of Object.entries(
        root.data.binds,
      )
    ) {
      const exposedType = this.tg.types[exposedTypeIdx] as FuncNode;
      const matIdx = exposedType.data.materializer;
      const mat = this.tg.materializers[matIdx as number];
      const serial = mat.data.serial;

      if (serial) {
        mutationsBind[exposedName] = exposedTypeIdx;
      } else {
        queriesBind[exposedName] = exposedTypeIdx;
      }
    }

    const queries = Object.keys(queriesBind).length > 0
      ? {
        ...root,
        data: { ...root.data, binds: queriesBind },
        name: "Query",
      }
      : null;
    const mutations = Object.keys(mutationsBind).length > 0
      ? {
        ...root,
        data: { ...root.data, binds: mutationsBind },
        name: "Mutation",
      }
      : null;

    return {
      // https://github.com/graphql/graphql-js/blob/main/src/type/introspection.ts#L36
      description: () => `${root.name} typegraph`,
      types: () => {
        // FIXME prefer traversal
        const collectInputType = (
          type: TypeNode,
          history: Set<string> = new Set(),
        ): string[] => {
          if (history.has(type.name)) {
            return [];
          }
          if (type.typedef === "struct") {
            history.add(type.name);
            return [
              type.name,
              ...Object.values(
                type.data.binds as Record<string, number>,
              ).flatMap((subTypeIdx) =>
                collectInputType(this.tg.types[subTypeIdx], history)
              ),
            ];
          }
          if (type.typedef === "list") {
            return collectInputType(
              this.tg.types[type.data.of as number],
              history,
            );
          }
          if (type.typedef === "optional") {
            return collectInputType(
              this.tg.types[type.data.of],
              history,
            );
          }
          return [];
        };

        const inputTypes = this.tg.types
          .filter((type) => type.typedef === "func")
          .flatMap((type) =>
            collectInputType(
              this.tg.types[(type as FuncNode).data.input as number],
            )
          );

        return this.tg.types
          .slice(1) // pop root into query & mutation
          .concat(queries ? [queries] : [])
          .concat(mutations ? [mutations] : [])
          .filter((type) => {
            // filter non-native GraphQL types
            const isEnforced = type.typedef === "injection" ||
              (type.typedef === "struct" &&
                Object.values(type.data.binds as Record<string, number>)
                  .map((bind) => this.tg.types[bind])
                  .every((nested) => nested.typedef === "injection")) ||
              !!type.data.apply_value ||
              (type.typedef === "struct" &&
                Object.values(type.data.binds as Record<string, number>)
                  .map((bind) => this.tg.types[bind])
                  .every((nested) => nested.data.apply_value));
            const isQuant = type.typedef === "optional" ||
              type.typedef === "list";
            const isInp = this.tg.types.some(
              (t) =>
                (t.typedef === "func" || t.typedef === "gen") &&
                this.tg.types[t.data.input as number] === type,
            );
            const isOutQuant =
              (type.typedef === "func" || type.typedef === "gen") &&
              ["list", "optional"].includes(
                this.tg.types[type.data.output as number].typedef,
              );
            return !isQuant && !isInp && !isOutQuant && !isEnforced;
          })
          .map((type) => {
            const res = this.formatType(
              type,
              false,
              inputTypes.includes(type.name),
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

  getType = ({ name }: { name: string }) => {
    const type = this.tg.types.find((type) => type.name === name);
    return type ? this.formatType(type, false, false) : null;
  };

  formatInputFields = ([name, typeIdx]: [string, number]) => {
    const type = this.tg.types[typeIdx];

    if (
      type.typedef === "injection" ||
      (type.typedef === "struct" &&
        Object.values(type.data.binds as Record<string, number>)
          .map((bind) => this.tg.types[bind])
          .every((nested) => nested.typedef === "injection")) ||
      !!type.data.apply_value ||
      (type.typedef === "struct" &&
        Object.values(type.data.binds as Record<string, number>)
          .map((bind) => this.tg.types[bind])
          .every((nested) => nested.data.apply_value))
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

    if (type.typedef === "optional") {
      const subtype = this.tg.types[type.data.of];
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

    if (type.typedef === "list") {
      return {
        ...common,
        kind: () => TypeKind.LIST,
        ofType: () => {
          const subtype = this.tg.types[type.data.of as number];
          return this.formatType(subtype, true, asInput);
        },
      };
    }

    // fixme provisory
    if (type.typedef as string === "Type") {
      return {
        ...common,
        kind: () => TypeKind.SCALAR,
        name: () => "Any",
        description: () => `${type.name} type`,
      };
    }

    if (type.typedef === "boolean") {
      return {
        ...common,
        kind: () => TypeKind.SCALAR,
        name: () => "Boolean",
        description: () => `${type.name} type`,
      };
    }

    if (type.typedef === "integer") {
      return {
        ...common,
        kind: () => TypeKind.SCALAR,
        name: () => "Int",
        description: () => `${type.name} type`,
      };
    }

    if (type.typedef === "float") {
      return {
        ...common,
        kind: () => TypeKind.SCALAR,
        name: () => "Float",
        description: () => `${type.name} type`,
      };
    }

    if (
      type.typedef === "string" ||
      type.typedef === "uri" ||
      type.typedef === "char" ||
      type.typedef === "json" ||
      type.typedef === "uuid"
    ) {
      return {
        ...common,
        kind: () => TypeKind.SCALAR,
        name: () => "String",
        description: () => `${type.name} type`,
      };
    }

    if (type.typedef === "func" || type.typedef === "gen") {
      const output = this.tg.types[type.data.output as number];
      return this.formatType(output, false, false);
    }

    if (type.typedef === "struct") {
      if (asInput) {
        return {
          ...common,
          kind: () => TypeKind.INPUT_OBJECT,
          name: () => `${type.name}Inp`,
          description: () => `${type.name} input type`,
          inputFields: () => {
            return Object.entries(
              type.data.binds as Record<string, number>,
            ).map(this.formatField(true));
          },
          interfaces: () => [],
        };
      } else {
        return {
          ...common,
          kind: () => TypeKind.OBJECT,
          name: () => type.name,
          description: () => `${type.name} type`,
          fields: () => {
            return Object.entries(
              type.data.binds as Record<string, number>,
            ).map(this.formatField(false));
          },
          interfaces: () => [],
        };
      }
    }

    throw Error(`unexpected type format ${type.typedef}`);
    // interface: fields, interfaces, possibleTypes
    // union: possibleTypes
    // enum: enumValues
  };

  policyDescription(type: TypeNode): string {
    const policies = type.policies.map((p) => this.tg.policies[p].name);

    let ret = "\n\nPolicies:\n";

    if (policies.length > 0) {
      ret += policies.map((p) => `- ${p}`).join("\n");
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

    if (type.typedef === "func" || type.typedef === "gen") {
      return {
        ...common,
        args: ({ includeDeprecated }: DeprecatedArg = {}) => {
          const inp = this.tg.types[type.data.input as number];
          ensure(
            inp.typedef === "struct",
            `${type} cannot be an input field, require struct`,
          );
          return Object.entries((inp as StructNode).data.binds)
            .map(this.formatInputFields)
            .filter((f) => f !== null);
        },
        type: () => {
          const output = this.tg.types[type.data.output as number];
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
