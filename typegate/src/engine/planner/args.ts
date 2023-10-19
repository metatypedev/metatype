// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import * as ast from "graphql/ast";
import { Kind } from "graphql";
import { TypeGraph } from "../../typegraph/mod.ts";
import {
  Context,
  Parents,
  PolicyIdx,
  StageId,
  TypeIdx,
  Variables,
} from "../../types.ts";
import { JSONValue } from "../../utils.ts";
import {
  ArrayNode,
  getVariantTypesIndexes,
  ObjectNode,
  Type,
  TypeNode,
  UnionNode,
} from "../../typegraph/type_node.ts";
import { mapValues } from "std/collections/map_values.ts";
import { filterValues } from "std/collections/filter_values.ts";

import { EffectType, EitherNode } from "../../typegraph/types.ts";

import { getChildTypes, visitTypes } from "../../typegraph/visitor.ts";
import { generateValidator } from "../typecheck/input.ts";
import { getParentId } from "../stage_id.ts";
import { BadContext } from "../../errors.ts";
import { selectInjection } from "./injection_utils.ts";

class MandatoryArgumentError extends Error {
  constructor(argDetails: string) {
    super(
      `mandatory argument ${argDetails} not found`,
    );
  }
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
  effect: EffectType,
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

  const validate = generateValidator(typegraph, typeIdx);

  const policies = collector.policies;

  if (!collector.hasDeps()) { // no deps
    // pre-compute
    const value = mapValues(
      compute,
      (c) =>
        c({
          ...DEFAULT_COMPUTE_PARAMS,
          effect: effect !== "read" ? effect : null,
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

  const parentId = getParentId(stageId);

  return {
    compute: (params) => {
      const value = mapValues(compute, (c) => c(params));
      validate(value);
      return value;
    },
    deps: Array.from(collector.deps.parent).map((dep) => `${parentId}.${dep}`),
    policies,
  };
}

const GENERATORS = {
  "now": () => new Date().toISOString(),
  // "uuid": () =>
} as const;

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
    private effect: EffectType,
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
      if (compute != null) {
        return compute;
      }
      // missing injection for the effect
      // fallthrough: the user provided value
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

      case Type.FLOAT: {
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
   * Collect the value of a parameter of type 'union' or 'either'.
   */
  private collectGeneralUnionArg(
    astNode: ast.ArgumentNode | ast.ObjectFieldNode,
    typeNode: UnionNode | EitherNode,
  ): ComputeArg {
    const { value: valueNode } = astNode;
    const variantTypesIndexes: number[] = getVariantTypesIndexes(typeNode);
    const errors: Error[] = [];

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
          error instanceof UnionTypeMismatchError ||
          error instanceof MandatoryArgumentError ||
          error instanceof UnexpectedPropertiesError
        ) {
          errors.push(error);
          continue;
        }

        console.error("variant error:", error);
        throw error;
      }
    }

    const expectedVariants: Set<string> = new Set();

    variantTypesIndexes
      .map((variantTypeIndex) => this.tg.type(variantTypeIndex))
      .map((variantType) => variantType.type)
      .forEach((typeName) => expectedVariants.add(typeName.toUpperCase()));

    throw new UnionTypeMismatchError(
      valueNode.kind,
      typeNode.type,
      errors,
      this.currentNode.path.length,
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
      throw new UnexpectedPropertiesError(
        unexpectedProps,
        this.currentNodeDetails,
        Object.keys(props),
      );
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
      const compute = this.collectInjection(typ);
      if (compute != null) {
        return compute;
      }
      // no injection for the effect
      // fallthrough
    }
    if (typ.type != Type.OPTIONAL) {
      throw new MandatoryArgumentError(this.currentNodeDetails);
    } else {
      this.addPoliciesFrom(typ.item);
    }
    const { default_value: defaultValue } = typ;
    return () => defaultValue;
  }

  /** Collect the value of an injected parameter. */
  private collectInjection(
    typ: TypeNode,
  ): ComputeArg | null {
    visitTypes(this.tg.tg, getChildTypes(typ), (node) => {
      this.addPoliciesFrom(node.idx);
      return true;
    });

    const injection = typ.injection!;

    switch (injection.source) {
      case "static": {
        const jsonString = selectInjection(injection.data, this.effect);
        if (jsonString == null) {
          return null;
        }
        return () => JSON.parse(jsonString);
      }
      case "secret": {
        const secretName = selectInjection(injection.data, this.effect);
        if (secretName == null) {
          return null;
        }
        return () => this.tg.parseSecret(typ, secretName);
      }
      case "context": {
        const contextKey = selectInjection(injection.data, this.effect);
        if (contextKey == null) {
          return null;
        }
        this.deps.context.add(contextKey);
        return ({ context }) => {
          const { [contextKey]: value = null } = context;
          if (value === null && typ.type != Type.OPTIONAL) {
            const suggestions = Object.keys(context).join(", ");
            throw new BadContext(
              `Non optional injection '${contextKey}' was not found in the context, available context keys are ${suggestions}`,
            );
          }
          return value;
        };
      }

      case "parent": {
        const parentTypeIdx = selectInjection(injection.data, this.effect);
        if (parentTypeIdx == null) {
          return null;
        }
        return this.collectParentInjection(typ, parentTypeIdx);
      }

      case "dynamic": {
        const generatorName = selectInjection(injection.data, this.effect);
        if (generatorName == null) {
          return null;
        }
        const generator = GENERATORS[generatorName as keyof typeof GENERATORS];
        if (generator == null) {
          throw new Error(
            `Unknown generator '${generatorName}' for dynamic injection`,
          );
        }
        return generator;
      }
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
          `non-optional injected argument ${name} is missing from parent: ${suggestions}`,
        );
      }

      return typeof value === "function" ? value() : value;
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
          console.log("argument not authorized with effect", this.effect);
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

  private getCurrentNode(): CollectNode | null {
    return this.stack[this.stack.length - 1] ?? null;
  }

  private get currentPath(): string {
    return this.stack.map((node) => node.path[node.path.length - 1]).join("/");
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
      `Type mismatch: got '${actual}' but expected '${exp}'`,
      `for argument ${argDetails}`,
    ].join(" ");
    super(errorMessage);
  }
}

class UnionTypeMismatchError extends Error {
  constructor(
    actual: string,
    expected: string,
    nestedErrors: Error[],
    depth: number,
    argDetails: string,
  ) {
    const indent = "    ".repeat(depth);
    const causes = nestedErrors.map((e) => `${indent}- ${e.message}\n`);
    const errorMessage = [
      `Type mismatch: got '${actual}' but expected '${expected}'`,
      `for argument ${argDetails}`,
      `caused by:\n${causes.join("")}`,
    ].join(" ");
    super(errorMessage);
  }
}

class UnexpectedPropertiesError extends Error {
  constructor(
    props: string[],
    nodeDetails: string,
    validProps: string[],
  ) {
    const name = props.length === 1 ? "property" : "properties";
    const errorMessage = [
      `Unexpected ${name} '${props.join(", ")}'`,
      `for argument ${nodeDetails};`,
      `valid properties are: ${validProps.join(", ")}`,
    ].join(" ");
    super(errorMessage);
  }
}
