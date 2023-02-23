// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import * as ast from "graphql/ast";
import { Kind } from "graphql";
import { TypeGraph } from "../typegraph.ts";
import { Context, Parents, Variables } from "../types.ts";
import { ensure, JSONValue } from "../utils.ts";
import {
  ArrayNode,
  getVariantTypesIndexes,
  ObjectNode,
  Type,
  TypeNode,
  UnionNode,
} from "../type_node.ts";
import { mapValues } from "std/collections/map_values.ts";
import { filterValues } from "std/collections/filter_values.ts";

import { JSONSchema, SchemaValidatorError, trimType } from "../typecheck.ts";
import { EitherNode } from "../types/typegraph.ts";

import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ removeAdditional: true });
addFormats(ajv);

class MandatoryArgumentError extends Error {
  constructor(argName: string, typeNode: TypeNode) {
    super(
      `mandatory argument '${argName}' of type '${typeNode.type}' not found`,
    );
  }
}

interface ArgumentObjectSchema {
  type: string;
  properties: Record<string, JSONSchema>;
  required?: string[];
}

export interface ComputeArg {
  (
    variables: Variables,
    parent: Parents | null,
    context: Context | null,
  ): unknown;
}

interface CollectedArg {
  compute: ComputeArg;
  policies: Record<string, string[]>;
  deps: string[];
}

/**
 * Utility class to collect the arguments for fields.
 *
 * The execution is explained in the following code block as a flow diagram in the comments.
 * ```graphql
 *  field(
 *      scalar_arg: 1,  # o -> collectArg()
 *      object_arg: {  # o -> collectArg() -> collectObjectArg()
 *          nested1: 12  # -> collectArg()
 *      },
 *      array_arg: [  # o -> collectArg() -> collectArrayArg()
 *          'hello',  # -> collectArg()
 *          'world',  # -> collectArg()
 *      ]
 *  ) {
 *      selection1
 *     selection2
 * }
 * ```
 */
export class ArgumentCollector {
  constructor(private tg: TypeGraph) {}

  /** Collect the arguments for the node `astNode` corresponding to type at `typeIdx` */
  collectArg(
    astNode: ast.ArgumentNode | ast.ObjectFieldNode | undefined,
    typeIdx: number,
    parentProps: Record<string, number>, // parent context?
    argName: string,
    argumentSchema?: JSONSchema,
  ): CollectedArg {
    const typ = this.tg.type(typeIdx);
    if (typ == null) {
      throw new Error(
        `Schema for the argument type idx=${typeIdx} cannot be found`,
      );
    }

    const policies = this.getPolicies(typ);

    if ("injection" in typ) {
      ensure(astNode == null, `cannot set injected arg: '${typ.title}'`);
      const [compute, deps] = this.collectInjection(typ, parentProps);
      return { compute, policies, deps };
    }

    // in case the argument node of the query is null,
    // try to get a default value for it, else throw an error
    if (astNode == null) {
      if (typ.type === Type.OPTIONAL) {
        const { default_value: defaultValue } = typ;
        const value = defaultValue ?? null;
        return {
          compute: () => value,
          policies,
          deps: [],
        };
      }

      if (typ.type === Type.OBJECT) {
        const props = typ.properties;
        return this.collectDefaults(props);
      }

      throw new MandatoryArgumentError(argName, typ);
    }

    if (typ.type === Type.OPTIONAL) {
      return this.merge(
        { policies },
        this.collectArg(astNode, typ.item, parentProps, argName),
      );
    }

    const { value: valueNode } = astNode;

    if (valueNode.kind === Kind.VARIABLE) {
      const {
        name: { value: varName },
      } = valueNode;
      return {
        compute: (vars) => vars[varName],
        policies,
        deps: [],
      };
    }

    // optional values without a default value are 'null'
    if (valueNode.kind === Kind.NULL) {
      return { compute: () => null, policies, deps: [] };
    }

    switch (typ.type) {
      case Type.OBJECT: {
        if (argumentSchema !== undefined) {
          const objectArgumentValue = this.getArgumentValue(astNode);
          const validator = ajv.compile(argumentSchema);
          validator(objectArgumentValue);

          if (validator.errors) {
            throw new SchemaValidatorError(
              objectArgumentValue,
              validator.errors,
              argumentSchema,
            );
          }
        }

        return this.merge(
          { policies },
          this.collectObjectArg(valueNode, typ, argName),
        );
      }

      case Type.ARRAY:
        return this.merge(
          { policies },
          this.collectArrayArg(valueNode, typ, parentProps, argName),
        );

      case Type.INTEGER: {
        if (valueNode.kind !== Kind.INT) {
          throw new TypeMismatchError(
            valueNode.kind,
            "INT",
            argName,
            typ.title,
          );
        }
        const value = Number(valueNode.value);
        return { compute: () => value, policies, deps: [] };
      }

      case Type.NUMBER: {
        if (valueNode.kind !== Kind.FLOAT && valueNode.kind !== Kind.INT) {
          throw new TypeMismatchError(
            valueNode.kind,
            ["FLOAT", "INT"],
            argName,
            typ.title,
          );
        }
        const value = Number(valueNode.value);
        return { compute: () => value, policies, deps: [] };
      }

      case Type.BOOLEAN: {
        if (valueNode.kind !== Kind.BOOLEAN) {
          throw new TypeMismatchError(
            valueNode.kind,
            "BOOLEAN",
            argName,
            typ.title,
          );
        }
        const value = Boolean(valueNode.value);
        return { compute: () => value, policies, deps: [] };
      }

      case Type.STRING: {
        if (valueNode.kind !== Kind.STRING) {
          throw new TypeMismatchError(
            valueNode.kind,
            "STRING",
            argName,
            typ.title,
          );
        }

        if (argumentSchema !== undefined) {
          const validator = ajv.compile(argumentSchema);
          validator(valueNode.value);

          if (validator.errors) {
            throw new SchemaValidatorError(
              valueNode.value,
              validator.errors,
              argumentSchema,
            );
          }
        }

        const value = String(valueNode.value);
        return { compute: () => value, policies, deps: [] };
      }

      case Type.UNION: {
        return this.merge(
          { policies },
          this.collectGeneralUnionArg(astNode, typ, parentProps, argName),
        );
      }

      case Type.EITHER: {
        return this.merge(
          { policies },
          this.collectGeneralUnionArg(astNode, typ, parentProps, argName),
        );
      }

      default:
        throw new Error(`unknown variable type '${typ.type}'`);
    }
  }

  /**
   * Returns the value of a given argument node.
   *
   * The value returned can be used to check that an argument meets all the
   * requirements of a given JSON schema.
   */
  private getArgumentValue(
    astNode: ast.ArgumentNode | ast.ObjectFieldNode,
  ): JSONValue {
    const valueNode = astNode.value;

    switch (valueNode.kind) {
      case Kind.STRING:
        return String(valueNode.value);

      case Kind.BOOLEAN:
        return Boolean(valueNode.value);

      case Kind.INT:
      case Kind.FLOAT:
        return Number(valueNode.value);

      case Kind.OBJECT: {
        const fields = valueNode.fields;
        const argumentObjectValue: Record<string, JSONValue> = {};
        for (const field of fields) {
          argumentObjectValue[field.name.value] = this.getArgumentValue(field);
        }
        return argumentObjectValue;
      }

      default:
        throw new Error(
          [
            `unsupported node '${astNode.name}' of type '${astNode.kind}',`,
            `cannot get the argument value from it`,
          ].join(" "),
        );
    }
  }

  /**
   * Returns the JSON Schema of an argument type node.
   *
   * The JSON Schema returned is useful to check non-primitive values such as
   * objects or unions.
   */
  private getArgumentSchema(typenode: TypeNode): JSONSchema {
    switch (typenode.type) {
      case Type.ARRAY: {
        const itemsTypeNode = this.tg.type(typenode.items);
        const schema = {
          ...trimType(typenode),
          items: this.getArgumentSchema(itemsTypeNode),
        };
        return schema;
      }

      case Type.UNION: {
        const schemes = typenode.anyOf
          .map((variantTypeIndex) => this.tg.type(variantTypeIndex))
          .map((variant) => this.getArgumentSchema(variant));

        const argumentSchema = {
          anyOf: schemes,
        };

        return argumentSchema;
      }

      case Type.EITHER: {
        const schemes = typenode.oneOf
          .map((variantTypeIndex) => this.tg.type(variantTypeIndex))
          .map((variant) => this.getArgumentSchema(variant));

        const argumentSchema = {
          oneOf: schemes,
        };

        return argumentSchema;
      }

      case Type.STRING:
      case Type.BOOLEAN:
      case Type.NUMBER:
      case Type.INTEGER: {
        const schema = trimType(typenode);
        return schema;
      }

      case Type.OBJECT: {
        const schema: ArgumentObjectSchema = {} as ArgumentObjectSchema;

        schema.type = Type.OBJECT;
        schema.required = [];
        schema.properties = {};

        for (
          const [propertyName, propertyTypeIndex] of Object.entries(
            typenode.properties,
          )
        ) {
          const propertyNode = this.tg.type(propertyTypeIndex);
          if (propertyNode.type !== "optional") {
            schema.required.push(propertyName);
          }
          schema.properties[propertyName] = this.getArgumentSchema(
            propertyNode,
          );
        }

        return schema;
      }

      default:
        throw new Error(
          [
            `unsupported type node '${typenode.type}'`,
            `to generate its argument schema`,
          ].join(" "),
        );
    }
  }

  /**
   * Collect the value of a parameter of type 'union' or 'either'.
   */
  private collectGeneralUnionArg(
    astNode: ast.ArgumentNode | ast.ObjectFieldNode,
    typeNode: UnionNode | EitherNode,
    parentProps: Record<string, number>,
    argName: string,
  ): CollectedArg {
    const { value: valueNode } = astNode;
    const argumentSchema = this.getArgumentSchema(typeNode);
    const variantTypesIndexes: number[] = getVariantTypesIndexes(typeNode);

    // throw type mismatch error only if the argument node of the query
    // does not match any of the subschemes (variant nodes).
    for (const variantTypeIndex of variantTypesIndexes) {
      try {
        return this.collectArg(
          astNode,
          variantTypeIndex,
          parentProps,
          argName,
          argumentSchema,
        );
      } catch (error) {
        if (
          error instanceof TypeMismatchError ||
          error instanceof MandatoryArgumentError
        ) {
          continue;
        }

        throw error;
      }
    }

    const expectedVariants: Set<string> = new Set();

    variantTypesIndexes
      .map((variantTypeIndex) => this.tg.type(variantTypeIndex))
      .map((variantType) => variantType.type)
      .forEach((typeName) => expectedVariants.add(typeName.toUpperCase()));

    throw new TypeMismatchError(
      valueNode.kind,
      [...expectedVariants],
      argName,
      typeNode.title,
    );
  }

  /** Collect the value of a parameter of type 'array'. */
  private collectArrayArg(
    valueNode: ast.ValueNode,
    typ: ArrayNode,
    parentProps: Record<string, number>,
    argName: string,
  ) {
    if (valueNode.kind !== Kind.LIST) {
      throw new TypeMismatchError(valueNode.kind, "LIST", argName, typ.title);
    }

    const { values: valueNodes } = valueNode;
    const itemTypeIdx = typ.items;

    const values: ComputeArg[] = [];
    const deps: string[] = [];
    const policies: Record<string, string[]> = {};

    // likely optimizabe as type should be shared
    for (const node of valueNodes) {
      const nested = this.collectArg(
        { value: node } as unknown as ast.ArgumentNode,
        itemTypeIdx,
        parentProps,
        argName,
      );
      values.push(nested.compute);
      deps.push(...nested.deps);
      // FIXME policies would be shared
      Object.assign(policies, nested.policies);
    }

    return {
      compute: (...params: Parameters<ComputeArg>) =>
        values.map((c) => c(...params)),
      deps,
      policies,
    };
  }

  /** Collect the value of an parameter of type 'object'. */
  private collectObjectArg(
    valueNode: ast.ValueNode,
    typ: ObjectNode,
    argName: string,
  ) {
    if (valueNode.kind !== Kind.OBJECT) {
      throw new TypeMismatchError(valueNode.kind, "OBJECT", argName, typ.title);
    }

    const { fields } = valueNode;
    const fieldByKeys = fields.reduce(
      (agg, field) => ({ ...agg, [field.name.value]: field }),
      {} as Record<string, ast.ObjectFieldNode>,
    );
    const props = typ.properties;

    const computes: Record<string, ComputeArg> = {};
    const deps = [];
    const policies: Record<string, string[]> = {};

    for (const [name, idx] of Object.entries(props)) {
      const nested = this.collectArg(fieldByKeys[name], idx, props, name);
      // TODO: apply renames
      computes[name] = nested.compute;
      deps.push(...nested.deps);
      Object.assign(policies, nested.policies);
      delete fieldByKeys[name];
    }

    for (const name of Object.keys(fieldByKeys)) {
      throw new Error(`'${name}' input as field but unknown`);
    }

    return {
      compute: (...params: Parameters<ComputeArg>) =>
        filterValues(
          mapValues(computes, (c) => c(...params)),
          (v) => v != undefined,
        ),
      policies,
      deps,
    };
  }

  /** Merge the policies and the deps */
  private merge(a: Partial<Omit<CollectedArg, "compute">>, b: CollectedArg) {
    return {
      compute: b.compute,
      policies: { ...a.policies, ...b.policies },
      deps: [...(a.deps ?? []), ...b.deps],
    };
  }

  /** Collect the default value for a parameter of type 'object' */
  private collectDefaults(props: Record<string, number>): CollectedArg {
    const computes: Record<string, ComputeArg> = {};
    const deps = [];
    const policies = {};

    for (const [name, idx] of Object.entries(props)) {
      const nested = this.collectDefault(idx, props);
      computes[name] = nested.compute;
      deps.push(...nested.deps);
      Object.assign(policies, nested.policies);
    }

    return {
      compute: (...params: Parameters<ComputeArg>) =>
        mapValues(computes, (c) => c(...params)),
      deps,
      policies,
    };
  }

  /** Collect the value for a missing parameter. */
  private collectDefault(
    typeIdx: number,
    parentProps: Record<string, number>,
  ): CollectedArg {
    const typ = this.tg.type(typeIdx);
    if (typ == null) {
      throw new Error(`Expected a type at index '${typeIdx}'`);
    }
    const policies = this.getPolicies(typ);
    if ("injection" in typ) {
      const [compute, deps] = this.collectInjection(typ, parentProps);
      return { compute, deps, policies };
    }
    if (typ.type != Type.OPTIONAL) {
      throw new Error(`Expected value for non-optional type '${typ.title}'`);
    }
    const { default_value: defaultValue } = typ;
    return {
      compute: () => defaultValue,
      deps: [],
      policies,
    };
  }

  /** Collect the value of an injected parameter. */
  private collectInjection(
    typ: TypeNode,
    parentProps: Record<string, number>,
  ): [compute: ComputeArg, deps: string[]] {
    const { injection, inject } = typ;

    switch (injection) {
      case "raw": {
        const value = JSON.parse(inject as string);
        // TODO typecheck
        return [() => value, []];
      }

      case "secret": {
        const name = inject as string;
        const value = this.tg.parseSecret(typ, name);

        return [() => value, []];
      }

      case "context": {
        const name = inject as string;
        return [
          (_vars, _parent, context) => {
            if (context == null) {
              // computing raw arguments -- without injection
              return null;
            }

            const { [name]: value } = context;
            if (value == null && typ.type != Type.OPTIONAL) {
              throw new Error(`injection '${name}' was not found in context`);
            }
            return value;
          },
          [],
        ];
      }

      case "parent":
        return this.collectParentInjection(typ, parentProps);

      default:
        throw new Error(`Unexpected injection type '${injection}'`);
    }
  }

  /** Collect the value of an injected parameter with 'parent' injection. */
  private collectParentInjection(
    typ: TypeNode,
    parentProps: Record<string, number>,
  ): [compute: ComputeArg, deps: string[]] {
    const ref = typ.inject as number;
    const name = Object.keys(parentProps).find(
      (name) => parentProps[name] === ref,
    );
    if (name == undefined) {
      throw new Error(`injection '${typ.title} (${name})' not found in parent`);
    }

    return [
      (_vars, parent) => {
        if (parent == null) {
          // computing raw arguments - without injection
          return null;
        }

        const { [name]: value } = parent;
        if (value == null) {
          if (typ.type == Type.OPTIONAL) {
            return typ.default_value;
          }

          const suggestions = `available fields from parent are: ${
            Object.keys(
              parent,
            ).join(", ")
          }`;
          throw new Error(
            `non-optional injection '${typ.title} (${name}) is missing from parent: ${suggestions}`,
          );
        }

        return value;
      },
      [name],
    ];
  }

  /** Get policies from a `TypeNode`. */
  private getPolicies(typ: TypeNode): Record<string, string[]> {
    if (typ.policies.length === 0) {
      return {};
    }
    return {
      [typ.title]: typ.policies.map((p) => this.tg.policy(p).name),
    };
  }
}

class TypeMismatchError extends Error {
  constructor(
    actual: string,
    expected: string | string[],
    argName: string,
    title: string,
  ) {
    const exp = (typeof expected == "string" ? [expected] : expected)
      .map((t) => `'${t}'`)
      .join(" or ");
    const errorMessage = [
      `Type mismatch: got '${actual}' but expected ${exp}`,
      `for argument '${argName}' named as '${title}'`,
    ].join(" ");
    super(errorMessage);
  }
}
