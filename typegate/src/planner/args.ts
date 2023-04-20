// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import * as ast from "graphql/ast";
import { Kind } from "graphql";
import { TypeGraph } from "../typegraph.ts";
import {
  Context,
  Parents,
  PolicyIdx,
  StageId,
  TypeIdx,
  Variables,
} from "../types.ts";
import { JSONValue } from "../utils.ts";
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

import {
  addJsonFormat,
  JSONSchema,
  SchemaValidatorError,
  trimType,
} from "../typecheck.ts";
import { EffectType, EitherNode } from "../types/typegraph.ts";

import Ajv from "ajv";
import addFormats from "ajv-formats";
import { getChildTypes, visitTypes } from "../typegraph/visitor.ts";

class MandatoryArgumentError extends Error {
  constructor(argDetails: string) {
    super(
      `mandatory argument ${argDetails} not found`,
    );
  }
}

interface ArgumentObjectSchema {
  type: string;
  properties: Record<string, JSONSchema>;
  required?: string[];
}

export interface ComputeArgParams {
  variables: Variables;
  parent: Parents;
  context: Context;
  effect: EffectType | null;
}

export const DEFAULT_COMPUTE_PARAMS: ComputeArgParams = {
  variables: {},
  parent: {},
  context: {},
  effect: null,
};

export interface ComputeArg<T = unknown> {
  (params: ComputeArgParams): T;
}

export interface ArgTypePolicies {
  policyIndices: PolicyIdx[];
  argDetails: string;
}

export type ArgPolicies = Map<TypeIdx, ArgTypePolicies>;

interface CollectNode {
  path: string[];
  astNode: ast.ArgumentNode | ast.ObjectFieldNode | undefined;
  typeIdx: number;
}

interface CollectedArgs {
  compute: ComputeArg<Record<string, unknown>>;
  deps: string[]; // parent deps
  policies: ArgPolicies;
}

export function collectArgs(
  typegraph: TypeGraph,
  stageId: StageId,
  effect: EffectType | "none",
  parentProps: Record<string, number>,
  typeIdx: TypeIdx,
  astNodes: Record<string, ast.ArgumentNode>,
): CollectedArgs {
  const collector = new ArgumentCollector(
    typegraph,
    stageId,
    effect,
    parentProps,
  );
  const argTypeNode = typegraph.type(typeIdx, Type.OBJECT);
  for (const argName of Object.keys(astNodes)) {
    if (!(argName in argTypeNode.properties)) {
      throw collector.unexpectedArgument([argName]);
    }
  }

  const compute: Record<string, ComputeArg> = {};
  for (const [argName, argTypeIdx] of Object.entries(argTypeNode.properties)) {
    compute[argName] = collector.collectArg({
      path: [argName],
      astNode: astNodes[argName],
      typeIdx: argTypeIdx,
    });
  }

  const jsonSchema = buildJsonSchema(argTypeNode, typegraph);
  const validator = ajv.compile(jsonSchema);
  const validate = (value: unknown) => {
    // FIXME: ajv "Maximum call stack size exceeded" error
    // validator may stackoverflow even if the schema/value are
    // not circular given that it is large
    // https://github.com/ajv-validator/ajv/issues/1581
    if (!validator(value) && validator.errors) {
      throw new SchemaValidatorError(value, validator.errors, jsonSchema);
    }
  };

  const policies = collector.policies;

  if (!collector.hasDeps()) { // no deps
    // pre-compute
    const value = mapValues(
      compute,
      (c) =>
        c({
          ...DEFAULT_COMPUTE_PARAMS,
          effect: effect !== "none" ? effect : null,
        }),
    );
    // typecheck
    validate(value);
    return {
      compute: () => value,
      deps: [],
      policies,
    };
  }

  return {
    compute: (params) => {
      const value = mapValues(compute, (c) => c(params));
      validate(value);
      return value;
    },
    deps: Array.from(collector.deps.parent),
    policies,
  };
}

interface Dependencies {
  context: Set<string>;
  parent: Set<string>;
  variables: Set<string>;
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
class ArgumentCollector {
  stack: CollectNode[] = []; // temporary
  policies: ArgPolicies = new Map();
  deps: Dependencies;

  constructor(
    private tg: TypeGraph,
    private stageId: StageId,
    private effect: EffectType | "none",
    private parentProps: Record<string, number>,
  ) {
    this.deps = {
      context: new Set(),
      parent: new Set(),
      variables: new Set(),
    };
  }

  /** Collect the arguments for the node `astNode` corresponding to type at `typeIdx` */
  collectArg(node: CollectNode): ComputeArg {
    if (this.stack.length !== 0) {
      throw new Error("Invalid state");
    }

    return this.collectArgPrivate(node);
  }

  private collectArgPrivate(
    node: CollectNode,
  ): ComputeArg {
    this.stack.push(node);

    let res: ComputeArg;
    try {
      res = this.collectArgImpl(node);
    } finally {
      const popped = this.stack.pop();
      if (popped != node) {
        // unreachable!
        // deno-lint-ignore no-unsafe-finally
        throw new Error("Invalid state");
      }
    }

    return res;
  }

  private collectArgImpl(node: CollectNode): ComputeArg {
    const { astNode, typeIdx } = node;

    const typ = this.tg.type(typeIdx);

    this.addPoliciesFrom(typeIdx);

    if ("injection" in typ) {
      if (astNode != null) {
        throw new Error(
          `Unexpected value for injected parameter ${this.currentNodeDetails}`,
        );
      }
      const compute = this.collectInjection(typ);
      return compute;
    }

    // in case the argument node of the query is null,
    // try to get a default value for it, else throw an error
    if (astNode == null) {
      if (typ.type === Type.OPTIONAL) {
        this.addPoliciesFrom(typ.item);
        const { default_value: defaultValue } = typ;
        const value = defaultValue ?? null;
        return () => value;
      }

      if (typ.type === Type.OBJECT) {
        const props = typ.properties;
        return this.collectDefaults(props);
      }

      throw new MandatoryArgumentError(this.currentNodeDetails);
    }

    if (typ.type === Type.OPTIONAL) {
      return this.collectArgPrivate({ ...this.currentNode, typeIdx: typ.item });
    }

    const { value: valueNode } = astNode;

    if (valueNode.kind === Kind.VARIABLE) {
      const {
        name: { value: varName },
      } = valueNode;
      this.deps.variables.add(varName);
      return ({ variables: vars }) => vars[varName];
    }

    switch (typ.type) {
      case Type.OBJECT: {
        return this.collectObjectArg(valueNode, typ);
      }

      case Type.ARRAY:
        return this.collectArrayArg(valueNode, typ);

      case Type.INTEGER: {
        if (valueNode.kind !== Kind.INT) {
          throw new TypeMismatchError(
            valueNode.kind,
            "INT",
            this.currentNodeDetails,
          );
        }
        const value = Number(valueNode.value);
        return () => value;
      }

      case Type.NUMBER: {
        if (valueNode.kind !== Kind.FLOAT && valueNode.kind !== Kind.INT) {
          throw new TypeMismatchError(
            valueNode.kind,
            ["FLOAT", "INT"],
            this.currentNodeDetails,
          );
        }
        const value = Number(valueNode.value);
        return () => value;
      }

      case Type.BOOLEAN: {
        if (valueNode.kind !== Kind.BOOLEAN) {
          throw new TypeMismatchError(
            valueNode.kind,
            "BOOLEAN",
            this.currentNodeDetails,
          );
        }
        const value = Boolean(valueNode.value);
        return () => value;
      }

      case Type.STRING: {
        if (valueNode.kind !== Kind.STRING) {
          throw new TypeMismatchError(
            valueNode.kind,
            "STRING",
            this.currentNodeDetails,
          );
        }
        const value = String(valueNode.value);
        return () => value;
      }

      case Type.UNION:
        return this.collectGeneralUnionArg(astNode, typ);

      case Type.EITHER:
        return this.collectGeneralUnionArg(astNode, typ);

      default:
        throw new Error(`unknown variable type '${typ.type}'`);
    }
  }

  /**
   * Returns the JSONValue
   *
   * see: getArgumentValue(.)
   */
  private getJsonValueFromRoot(node: ast.ValueNode, name: string): JSONValue {
    switch (node.kind) {
      case Kind.STRING:
        return String(node.value);

      case Kind.BOOLEAN:
        return Boolean(node.value);

      case Kind.INT:
      case Kind.FLOAT:
        return Number(node.value);

      case Kind.OBJECT: {
        const fields = node.fields;
        const argumentObjectValue: Record<string, JSONValue> = {};
        for (const field of fields) {
          argumentObjectValue[field.name.value] = this.getJsonValueFromRoot(
            field.value,
            field.name.value,
          );
        }
        return argumentObjectValue;
      }

      case Kind.LIST:
        return node.values.map((v) =>
          this.getArgumentValue({ value: v } as ast.ArgumentNode)
        );

      default:
        throw new Error(
          [
            `unsupported node '${name}' of type '${node.kind}',`,
            `cannot get the argument value from it`,
          ].join(" "),
        );
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
    return this.getJsonValueFromRoot(astNode.value, astNode.name.value);
  }

  /**
   * Returns the JSON Schema of an argument type node.
   *
   * The JSON Schema returned is useful to check non-primitive values such as
   * objects or unions.
   */
  private getArgumentSchema(typenode: TypeNode): JSONSchema {
    switch (typenode.type) {
      case Type.OPTIONAL: {
        // Note:
        // The field `item` does not exist in JSON Schema
        // we must get its schema and make the type nullable
        const itemTypeNode = this.tg.type(typenode.item);
        const nullableType = [itemTypeNode.type, "null"];
        const itemSchema = this.getArgumentSchema(itemTypeNode);
        const schema = {
          ...itemSchema,
          type: nullableType,
        };
        return schema;
      }
      case Type.ARRAY: {
        const itemsTypeNode = this.tg.type(typenode.items);
        const itemsSchema = this.getArgumentSchema(itemsTypeNode);
        const schema = {
          ...trimType(typenode),
          items: itemsSchema,
        };
        return schema;
      }

      case Type.UNION: {
        const schemes = typenode.anyOf
          .map((variantTypeIndex) => this.tg.type(variantTypeIndex))
          .map((variant) => this.getArgumentSchema(variant));

        const argumentSchema = {
          anyOf: schemes as JSONSchema[],
        };

        return argumentSchema;
      }

      case Type.EITHER: {
        const schemes = typenode.oneOf
          .map((variantTypeIndex) => this.tg.type(variantTypeIndex))
          .map((variant) => this.getArgumentSchema(variant));

        const argumentSchema = {
          oneOf: schemes as JSONSchema[],
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
          if (propertyNode.type !== Type.OPTIONAL) {
            schema.required.push(propertyName);
            schema.properties[propertyName] = this.getArgumentSchema(
              propertyNode,
            );
          } else {
            schema.properties[propertyName] = this.getArgumentSchema(
              this.tg.type(propertyNode.item),
            );
          }
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
  ): ComputeArg {
    const { value: valueNode } = astNode;
    const variantTypesIndexes: number[] = getVariantTypesIndexes(typeNode);

    // throw type mismatch error only if the argument node of the query
    // does not match any of the subschemes (variant nodes).
    for (const variantTypeIndex of variantTypesIndexes) {
      try {
        return this.collectArgPrivate({
          ...this.currentNode,
          typeIdx: variantTypeIndex,
        });
      } catch (error) {
        if (
          error instanceof TypeMismatchError ||
          error instanceof MandatoryArgumentError ||
          error instanceof SchemaValidatorError
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
      this.currentNodeDetails,
    );
  }

  /** Collect the value of a parameter of type 'array'. */
  private collectArrayArg(
    valueNode: ast.ValueNode,
    typ: ArrayNode,
  ): ComputeArg {
    if (valueNode.kind !== Kind.LIST) {
      throw new TypeMismatchError(
        valueNode.kind,
        "LIST",
        this.currentNodeDetails,
      );
    }

    const { values: valueNodes } = valueNode;
    const itemTypeIdx = typ.items;

    const computes: ComputeArg[] = [];

    // likely optimizabe as type should be shared
    for (const node of valueNodes) {
      if (node.kind === Kind.NULL) {
        computes.push(() => null);
      } else {
        computes.push(
          this.collectArgPrivate({
            ...this.currentNode,
            astNode: { value: node } as unknown as ast.ArgumentNode,
            typeIdx: itemTypeIdx,
          }),
        );
      }
    }

    return (...params) => computes.map((c) => c(...params));
  }

  /** Collect the value of an parameter of type 'object'. */
  private collectObjectArg(valueNode: ast.ValueNode, typ: ObjectNode) {
    if (valueNode.kind !== Kind.OBJECT) {
      throw new TypeMismatchError(
        valueNode.kind,
        "OBJECT",
        this.currentNodeDetails,
      );
    }

    const { fields } = valueNode;
    const fieldByKeys = fields.reduce(
      (agg, field) => ({ ...agg, [field.name.value]: field }),
      {} as Record<string, ast.ObjectFieldNode>,
    );
    const props = typ.properties;

    const computes: Record<string, ComputeArg> = {};

    for (const [name, idx] of Object.entries(props)) {
      const parentNode = this.currentNode;
      // TODO: apply renames
      computes[name] = this.collectArgPrivate({
        ...parentNode,
        path: [...parentNode.path, name],
        astNode: fieldByKeys[name],
        typeIdx: idx,
      });
      delete fieldByKeys[name];
    }

    const unexpectedProps = Object.keys(fieldByKeys);
    if (unexpectedProps.length > 0) {
      const details = [
        unexpectedProps.map((name) => `'${name}'`).join(", "),
        `for argument ${this.currentNodeDetails}`,
      ].join(" ");
      throw new Error(`Unexpected props ${details}`);
    }

    return (...params: Parameters<ComputeArg>) =>
      filterValues(
        mapValues(computes, (c) => c(...params)),
        (v) => v != undefined,
      );
  }

  /** Collect the default value for a parameter of type 'object';
   * this requires that all the props have a default value.
   */
  private collectDefaults(props: Record<string, number>): ComputeArg {
    const computes: Record<string, ComputeArg> = {};

    for (const [name, idx] of Object.entries(props)) {
      computes[name] = this.collectDefault(idx);
    }

    return (...params: Parameters<ComputeArg>) =>
      mapValues(computes, (c) => c(...params));
  }

  /** Collect the value for a missing parameter. */
  private collectDefault(
    typeIdx: number,
  ): ComputeArg {
    const typ = this.tg.type(typeIdx);
    if (typ == null) {
      throw new Error(`Expected a type at index '${typeIdx}'`);
    }
    this.addPoliciesFrom(typeIdx);

    if ("injection" in typ) {
      return this.collectInjection(typ);
    }
    if (typ.type != Type.OPTIONAL) {
      throw new Error(
        `Expected value for non-optional type argument ${this.currentNodeDetails}`,
      );
    } else {
      this.addPoliciesFrom(typ.item);
    }
    const { default_value: defaultValue } = typ;
    return () => defaultValue;
  }

  /** Collect the value of an injected parameter. */
  private collectInjection(
    typ: TypeNode,
  ): ComputeArg {
    visitTypes(this.tg.tg, getChildTypes(typ), (node) => {
      this.addPoliciesFrom(node.idx);
      return true;
    });

    const source =
      typ.injection!.cases.find((c) => c.effect == this.effect)?.injection ??
        typ.injection!["default"];

    if (source == null) {
      if (typ.type === Type.OPTIONAL) {
        const value = typ.default_value ?? null;
        return () => value;
      }
      throw new Error("Invalid injection");
    }

    switch (source.source) {
      case "static":
        return () => JSON.parse(source.data);
      case "secret":
        return () => this.tg.parseSecret(typ, source.data);
      case "context": {
        const name = source.data;
        this.deps.context.add(name);
        return ({ context }) => {
          const { [name]: value } = context;
          if (value == null && typ.type != Type.OPTIONAL) {
            throw new Error(
              `Non optional injection '${name}' was not found in the context`,
            );
          }
          return value;
        };
      }
      case "parent":
        return this.collectParentInjection(typ, source.data);
      default:
        throw new Error("Unreachable");
    }
  }

  /** Collect the value of an injected parameter with 'parent' injection. */
  private collectParentInjection(
    typ: TypeNode,
    ref: number,
  ): ComputeArg {
    const name = Object.keys(this.parentProps).find(
      (name) => this.parentProps[name] === ref,
    );
    if (name == undefined) {
      throw new Error(`injection '${typ.title} (${name})' not found in parent`);
    }

    this.deps.parent.add(name);
    visitTypes(this.tg.tg, getChildTypes(typ), (node) => {
      this.addPoliciesFrom(node.idx);
      return true;
    });

    return ({ parent }) => {
      const { [name]: value } = parent;
      if (value == null) {
        if (typ.type === Type.OPTIONAL) {
          return typ.default_value;
        }

        const suggestions = `available fields from parent are: ${
          Object.keys(
            parent,
          ).join(", ")
        }`;
        throw new Error(
          `non-optional injection argument ${this.currentNodeDetails} is missing from parent: ${suggestions}`,
        );
      }

      return value;
    };
  }

  private addPoliciesFrom(typeIdx: TypeIdx) {
    const typ = this.tg.type(typeIdx);
    this.policies.set(typeIdx, {
      argDetails: this.currentNodeDetails,
      policyIndices: typ.policies.map((p) => {
        if (typeof p === "number") {
          return p;
        }
        const polIdx = p[this.effect];
        if (polIdx == null) {
          // not authorized
          throw this.unexpectedArgument(this.currentNode.path);
        }
        return polIdx;
      }),
    });
  }

  private get currentNode(): CollectNode {
    const len = this.stack.length;
    if (this.stack.length === 0) {
      throw new Error("Invalid state");
    }
    return this.stack[len - 1];
  }

  get currentNodeDetails() {
    const { path, typeIdx } = this.currentNode;
    const typeNode = this.tg.type(typeIdx);
    return [
      `'${path.join(".")}'`,
      `of type '${typeNode.type}' ('${typeNode.title}')`,
      `at ${this.stageId}`,
    ].join(" ");
  }

  unexpectedArgument(path: string[]) {
    const details = [
      `'${path.join(".")}'`,
      `at ${this.stageId}`,
    ].join(" ");
    throw new Error(`Unexpected argument ${details}`);
  }

  hasDeps() {
    return this.deps.context.size + this.deps.parent.size +
        this.deps.variables.size > 0;
  }
}

class TypeMismatchError extends Error {
  constructor(
    actual: string,
    expected: string | string[],
    argDetails: string,
  ) {
    const exp = (typeof expected == "string" ? [expected] : expected)
      .map((t) => `'${t}'`)
      .join(" or ");
    const errorMessage = [
      `Type mismatch: got '${actual}' but expected ${exp}`,
      `for argument ${argDetails}`,
    ].join(" ");
    super(errorMessage);
  }
}

const visitedObject = new Set<string>();
const ajv = new Ajv({
  allowUnionTypes: true, // allow multiple non-null types in "type"
  inlineRefs: true, // inline schemas with no refs (reduced size)
});
addFormats(ajv);
addJsonFormat(ajv);

function buildJsonSchema(typeNode: TypeNode, tg: TypeGraph) {
  return new JsonSchemaBuilder(tg).build(typeNode);
}

function pathOf(typeNode: TypeNode): string {
  return `#/schemas/temp/${typeNode.title}`;
}

function refOf(typeNode: TypeNode): JSONSchema {
  return { $ref: pathOf(typeNode) };
}

function addSchemaToAjv(schema: JSONSchema, path: string) {
  if (ajv.getSchema(path)) return;
  ajv.addSchema(schema, path);
}

class JsonSchemaBuilder {
  types: TypeNode[];

  constructor(tg: TypeGraph) {
    this.types = tg.tg.types;
  }

  build(typeNode: TypeNode): JSONSchema {
    switch (typeNode.type) {
      case Type.OPTIONAL: {
        const wrappedType = this.types[typeNode.item];
        if (visitedObject.has(wrappedType.title)) {
          const resultSchema = refOf(wrappedType);
          resultSchema.type = ["object", "null"];
          return resultSchema;
        } else {
          if (
            wrappedType.type == Type.UNION ||
            wrappedType.type == Type.EITHER
          ) {
            const resultSchema = this.build(wrappedType);
            (resultSchema.type as Array<string>)!.push("null");
            return resultSchema;
          }
          const itemSchema = this.build(wrappedType);
          const nullableType = Array.isArray(itemSchema.type)
            ? [...itemSchema.type, "null"]
            : [itemSchema.type, "null"];
          // Note: spread operator have lower precedence
          return { ...itemSchema, type: nullableType };
        }
      }

      case Type.OBJECT: {
        visitedObject.add(typeNode.title);
        const resultSchema = this.buildObjectSchema(typeNode);
        addSchemaToAjv(resultSchema, pathOf(typeNode));
        visitedObject.delete(typeNode.title);
        return resultSchema;
      }

      case Type.ARRAY: {
        const wrappedType = this.types[typeNode.items];
        let itemsSchema = null;
        if (visitedObject.has(wrappedType.title)) {
          itemsSchema = refOf(wrappedType);
        } else {
          itemsSchema = this.build(wrappedType);
        }
        return {
          ...trimType(typeNode),
          items: itemsSchema,
        };
      }

      case Type.UNION:
        return this.buildGeneralUnionSchema(typeNode, "anyOf");

      case Type.EITHER:
        return this.buildGeneralUnionSchema(typeNode, "oneOf");

      case Type.FUNCTION:
        // unreachable: should have been checked in the typegraph validation hook
        throw new Error(
          `${typeNode.title} (${typeNode.type}) is not supported`,
        );

      case Type.INTEGER:
      case Type.NUMBER:
      case Type.STRING:
      case Type.BOOLEAN:
        // scalar types
        return trimType(typeNode);

      case Type.ANY:
        return {};
    }
  }

  buildObjectSchema(node: ObjectNode): JSONSchema {
    const properties: Record<string, JSONSchema> = {};
    const required: string[] = [];
    for (const [propName, propTypeIdx] of Object.entries(node.properties)) {
      const propType = this.types[propTypeIdx];
      if (visitedObject.has(propType.title)) {
        properties[propName] = refOf(propType);
      } else {
        properties[propName] = this.build(propType);
      }
      if (propType.type !== Type.OPTIONAL) {
        required.push(propName);
      }
    }
    return {
      ...trimType(node),
      properties,
      required,
      // not necessary since they are already checked in the collector
      // additionalProperties: false,
    };
  }

  listUnionEitherTypes(
    node: UnionNode | EitherNode,
    variantsKey: "anyOf" | "oneOf",
  ): string[] {
    const variantTypeIndices =
      node[variantsKey as keyof typeof node] as number[];
    let canHoldObject = false;
    const variantsTypes = [];

    for (const typeIdx of variantTypeIndices) {
      const currentNode = this.types[typeIdx];
      const type = this.types[typeIdx].type;
      if (visitedObject.has(currentNode.title)) {
        canHoldObject = true;
      }
      if (
        currentNode.type == Type.EITHER ||
        currentNode.type == Type.UNION
      ) {
        // parent either/union node must be
        // aware of its children either/union node(s) types
        const key = currentNode.type == Type.UNION ? "anyOf" : "oneOf";
        const subTypes = this.listUnionEitherTypes(currentNode, key);
        variantsTypes.push(...subTypes);
      }
      variantsTypes.push(type);
    }

    // Ref:
    // https://json-schema.org/understanding-json-schema/reference/combining.html
    if (canHoldObject && !variantsTypes.includes("object")) {
      variantsTypes.push("object");
    }

    // remove duplicates
    const distinctTypes = new Set<string>(variantsTypes);

    // either and union are not valid JSON schema types
    distinctTypes.delete("either");
    distinctTypes.delete("union");

    return Array.from(distinctTypes);
  }

  buildGeneralUnionSchema(node: UnionNode, variantsKey: "anyOf"): JSONSchema;
  buildGeneralUnionSchema(node: EitherNode, variantsKey: "oneOf"): JSONSchema;
  buildGeneralUnionSchema(
    node: UnionNode | EitherNode,
    variantsKey: "anyOf" | "oneOf",
  ): JSONSchema {
    const variantTypeIndices =
      node[variantsKey as keyof typeof node] as number[];

    const variantSchemas = variantTypeIndices.map((typeIdx) => {
      const currentNode = this.types[typeIdx];
      return visitedObject.has(currentNode.title)
        ? refOf(currentNode)
        : this.build(currentNode);
    });
    // Ref:
    // https://json-schema.org/understanding-json-schema/reference/type.html
    return {
      type: this.listUnionEitherTypes(node, variantsKey),
      [variantsKey]: variantSchemas,
    };
  }
}
