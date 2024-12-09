// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type * as ast from "graphql/ast";
import { Kind } from "graphql";
import type { TypeGraph } from "../../typegraph/mod.ts";
import type {
  Context,
  Parents,
  PolicyIdx,
  StageId,
  TypeIdx,
  Variables,
} from "../../types.ts";
import type { JSONValue } from "../../utils.ts";
import type {
  ListNode,
  ObjectNode,
  TypeNode,
  UnionNode,
} from "../../typegraph/type_node.ts";
import { getVariantTypeIndices, Type } from "../../typegraph/type_node.ts";
import { mapValues } from "@std/collections/map-values";
import { filterValues } from "@std/collections/filter-values";

import type {
  EffectType,
  EitherNode,
  FunctionNode,
  Injection,
  InjectionNode,
} from "../../typegraph/types.ts";

import { getChildTypes, visitTypes } from "../../typegraph/visitor.ts";
import { generateValidator } from "../typecheck/input.ts";
import { getParentId } from "../stage_id.ts";
import { BadContext } from "../../errors.ts";
import { selectInjection } from "./injection_utils.ts";
import {
  compileParameterTransformer,
  defaultParameterTransformer,
} from "./parameter_transformer.ts";
import { QueryFunction as JsonPathQuery } from "../../libs/jsonpath.ts";
import { getInjection } from "../../typegraph/utils.ts";
import { GeneratorNode } from "../../runtimes/random.ts";
import DynamicInjection from "../injection/dynamic.ts";

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
  fnTypeNode: FunctionNode,
  astNodes: Record<string, ast.ArgumentNode>,
): CollectedArgs {
  const { input: typeIdx, parameterTransform, injections: injectionTree } =
    fnTypeNode;
  const collector = new ArgumentCollector(
    typegraph,
    stageId,
    effect,
    parentProps,
    injectionTree ?? {},
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
  const parameterTransformer = parameterTransform == null
    ? defaultParameterTransformer
    : compileParameterTransformer(
      typegraph,
      parentProps,
      parameterTransform.transform_root,
    );

  const policies = collector.policies;

  if (!collector.hasDeps()) { // no deps
    // pre-compute
    const value = cleanObjectValue(mapValues(
      compute,
      (c) =>
        c({
          ...DEFAULT_COMPUTE_PARAMS,
          effect: effect !== "read" ? effect : null,
        }),
    ));
    // typecheck
    validate(value);
    return {
      compute: (c) => {
        const { parent, context } = c;
        return parameterTransformer({ args: value, parent, context });
      },
      deps: [],
      policies,
    };
  }

  const parentId = getParentId(stageId);

  return {
    compute: (params) => {
      const value = mapValues(compute, (c) => c(params));
      validate(value);
      const { parent, context } = params;
      return parameterTransformer({ args: value, parent, context });
    },
    deps: Array.from(collector.deps.parent).map((dep) => `${parentId}.${dep}`),
    policies,
  };
}

interface Dependencies {
  context: Set<string>;
  parent: Set<string>;
  variables: Set<string>;
}

// TODO only filter out non-required optional fields
function cleanObject(
  c: ComputeArg<Record<string, unknown>>,
  optional?: false,
): ComputeArg<Record<string, unknown>>;
function cleanObject(
  c: ComputeArg<Record<string, unknown>>,
  optional: true,
): ComputeArg<Record<string, unknown> | null>;
function cleanObject(
  c: ComputeArg<Record<string, unknown>>,
  optional = false,
): ComputeArg<Record<string, unknown> | null> {
  if (optional) {
    return (...params) => {
      const res = filterValues(c(...params), (v) => v != null);
      return Object.keys(res).length === 0 ? null : res;
    };
  } else {
    return (...params) => filterValues(c(...params), (v) => v != null);
  }
}

function cleanObjectValue(
  obj: Record<string, unknown>,
  optional?: false,
): Record<string, unknown>;
function cleanObjectValue(
  obj: Record<string, unknown>,
  optional: true,
): Record<string, unknown> | null;
function cleanObjectValue(
  obj: Record<string, unknown>,
  optional = false,
): Record<string, unknown> | null {
  if (optional) {
    const res = filterValues(obj, (v) => v != null);
    return Object.keys(res).length === 0 ? null : res;
  } else {
    return filterValues(obj, (v) => v != null);
  }
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
 *      list_arg: [  # o -> collectArg() -> collectListArg()
 *          'hello',  # -> collectArg()
 *          'world',  # -> collectArg()
 *      ],
 *      explicit_null_arg: null,  # o -> collectArg() => ((_) => null)
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
    private injectionTree: Record<string, InjectionNode>,
  ) {
    this.deps = {
      context: new Set(),
      parent: new Set(),
      variables: new Set(),
    };
    this.stageId;
  }

  #getInjection(path: string[]): Injection | null {
    return getInjection(this.injectionTree, path);
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

    const typ: TypeNode = this.tg.type(typeIdx);

    this.addPoliciesFrom(typeIdx);

    const injection = this.#getInjection(node.path);
    if (injection != null) {
      if (astNode != null) {
        throw new Error(
          `Unexpected value for injected parameter ${this.currentNodeDetails}`,
        );
      }
      const compute = this.collectInjection(typ, injection);
      if (compute != null) {
        return compute;
      }
      // missing injection for the effect
      // fallthrough: the user provided value
    }

    // in case the argument node of the query is not defined
    // try to get a default value for it, else throw an error
    if (astNode == null) {
      if (typ.type === Type.OPTIONAL) {
        this.addPoliciesFrom(typ.item);
        const itemType = this.tg.type(typ.item);
        const { default_value: defaultValue } = typ;
        if (defaultValue != null) {
          return () => defaultValue;
        }
        switch (itemType.type) {
          case Type.OBJECT:
            try {
              return cleanObject(
                this.collectDefaults(
                  itemType.properties,
                  node.path,
                ),
                true,
              );
            } catch (_e) {
              // fallthrough
            }
            break;

          case Type.UNION:
            try {
              for (const idx of itemType.anyOf) {
                const variantType = this.tg.type(idx);
                if (variantType.type === Type.OBJECT) {
                  return cleanObject(
                    this.collectDefaults(
                      variantType.properties,
                      node.path,
                    ),
                    true,
                  );
                }
              }
            } catch (_e) {
              // fallthrough
            }
            break;

          case Type.EITHER: {
            let compute: ComputeArg | null = null;
            for (const idx of itemType.oneOf) {
              const variantType = this.tg.type(idx);
              if (variantType.type === Type.OBJECT) {
                try {
                  if (compute != null) {
                    // multiple matches
                    break;
                  }
                  compute = this.collectDefaults(
                    variantType.properties,
                    node.path,
                  );
                  break;
                } catch (_e) {
                  // fallthrough
                }
              }
            }
            if (compute != null) {
              return compute;
            }
            break;
          }
        }
        return () => null;
      }

      if (typ.type === Type.OBJECT) {
        const props = typ.properties;
        return this.collectDefaults(props, node.path);
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
      if (typ.type === Type.OBJECT) {
        const injectedFields = this.collectInjectedFields(
          typ.properties,
          node.path,
        );
        return (params: ComputeArgParams) => {
          const fromVars = params.variables[varName] as Record<string, unknown>;
          const injected = injectedFields(params);
          return { ...fromVars, ...injected };
        };
      }
      return ({ variables: vars }) => vars[varName];
    }

    // Note: this occurs when the graphql query arg has an *explicit* null value
    // func( .., node: null, ..) { .. }
    // https://spec.graphql.org/June2018/#sec-Null-Value
    if (valueNode.kind === Kind.NULL) {
      return (_args) => null;
    }

    switch (typ.type) {
      case Type.OBJECT: {
        return this.collectObjectArg(valueNode, typ);
      }

      case Type.LIST:
        return this.collectListArg(valueNode, typ);

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
    const variantTypesIndexes: number[] = getVariantTypeIndices(typeNode);
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
  private collectListArg(
    valueNode: ast.ValueNode,
    typ: ListNode,
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

    return cleanObject((...params: Parameters<ComputeArg>) =>
      mapValues(computes, (c) => c(...params))
    );
  }

  /** Collect the default value for a parameter of type 'object';
   * this requires that all the props have a default value.
   */
  private collectDefaults(
    props: Record<string, number>,
    path: string[],
  ): ComputeArg<Record<string, unknown>> {
    const computes: Record<string, ComputeArg> = {};

    for (const [name, idx] of Object.entries(props)) {
      path.push(name);
      computes[name] = this.collectDefault(idx, path);
      path.pop();
    }

    return (...params) => mapValues(computes, (c) => c(...params));
  }

  private collectInjectedFields(props: Record<string, number>, path: string[]) {
    const computes: Record<string, ComputeArg | null> = {};
    for (const [name, idx] of Object.entries(props)) {
      path.push(name);
      const injection = this.#getInjection(path);
      if (injection != null) {
        const value = this.collectInjection(this.tg.type(idx), injection);
        computes[name] = value;
      }
      path.pop();
    }

    return (params: ComputeArgParams) =>
      mapValues(computes, (c) => c?.(params) ?? null);
  }

  /** Collect the value for a missing parameter. */
  private collectDefault(
    typeIdx: number,
    path: string[],
  ): ComputeArg {
    const typ = this.tg.type(typeIdx);
    this.addPoliciesFrom(typeIdx);

    const injection = this.#getInjection(path);
    if (injection != null) {
      const compute = this.collectInjection(typ, injection);
      if (compute != null) {
        return compute;
      }
      // no injection for the effect
      // fallthrough
    }

    switch (typ.type) {
      case Type.OPTIONAL: {
        this.addPoliciesFrom(typ.item);
        const { default_value: defaultValue = null } = typ;
        return () => defaultValue;
      }

      case Type.OBJECT: {
        return this.collectDefaults(typ.properties, path);
      }

      default:
        throw new MandatoryArgumentError(this.currentNodeDetails);
    }
  }

  /** Collect the value of an injected parameter. */
  private collectInjection(
    typ: TypeNode,
    injection: Injection,
  ): ComputeArg | null {
    visitTypes(this.tg.tg, getChildTypes(typ), (node) => {
      this.addPoliciesFrom(node.idx);
      return true;
    });

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
        const contextPath = selectInjection(injection.data, this.effect);
        if (contextPath == null) {
          return null;
        }
        this.deps.context.add(contextPath);
        const queryContext = JsonPathQuery.create(contextPath, {
          strict: typ.type !== Type.OPTIONAL,
          rootPath: "<context>",
        })
          .asFunction();
        return ({ context }) => {
          try {
            return queryContext(context) ?? null;
          } catch (e) {
            const msg = e.message;
            throw new BadContext("Error while querying context: " + msg);
          }
        };
      }

      case "parent": {
        const parentKey = selectInjection(injection.data, this.effect);
        if (parentKey == null) {
          return null;
        }
        return this.collectParentInjection(typ, parentKey);
      }

      case "dynamic": {
        const generatorName = selectInjection(injection.data, this.effect);
        if (generatorName == null) {
          return null;
        }
        const generator =
          DynamicInjection[generatorName as keyof typeof DynamicInjection];
        if (generator == null) {
          throw new Error(
            `Unknown generator '${generatorName}' for dynamic injection`,
          );
        }
        return generator;
      }

      case "random": {
        return () =>
          this.tg.getRandom(
            typ,
            selectInjection<GeneratorNode>(injection.data, this.effect),
          );
      }
    }
  }

  /** Collect the value of an injected parameter with 'parent' injection. */
  private collectParentInjection(
    typ: TypeNode,
    key: string,
  ): ComputeArg {
    if (!Object.hasOwn(this.parentProps, key)) {
      throw new Error(`injection '${key}' not found in parent`);
    }

    this.deps.parent.add(key);
    visitTypes(this.tg.tg, getChildTypes(typ), (node) => {
      this.addPoliciesFrom(node.idx);
      return true;
    });

    return ({ parent }) => {
      const { [key]: value } = parent;
      if (value == null) {
        if (typ.type === Type.OPTIONAL) {
          return typ.default_value;
        }

        const keys = Object.keys(parent).join(", ");
        const suggestions = `available fields from parent are: ${keys}`;
        throw new Error(
          `non-optional injected argument ${key} is missing from parent: ${suggestions}`,
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
