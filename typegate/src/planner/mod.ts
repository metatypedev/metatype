// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import * as ast from "graphql/ast";
import { Kind } from "graphql";
import { ComputeStage } from "../engine.ts";
import { FragmentDefs, resolveSelection } from "../graphql.ts";
import { TypeGraph } from "../typegraph.ts";
import { ComputeStageProps, PolicyStagesFactory } from "../types.ts";
import { getWrappedType, isQuantifier, Type } from "../type_node.ts";
import { DenoRuntime } from "../runtimes/deno.ts";
import { ensure, unparse } from "../utils.ts";
import { ArgumentCollector, ComputeArg } from "./args.ts";
import { FromVars } from "../runtimes/graphql.ts";
import { mapValues } from "std/collections/map_values.ts";
import { filterValues } from "std/collections/filter_values.ts";

interface Node {
  name: string;
  path: string[];
  selectionSet?: ast.SelectionSetNode;
  args: readonly ast.ArgumentNode[];
  typeIdx: number;
  parent?: Node;
  parentStage?: ComputeStage;
}

export interface Plan {
  stages: ComputeStage[];
  policies: PolicyStagesFactory;
  policyArgs: FromVars<Record<string, Record<string, unknown>>>;
}

/**
 * A utility class to plan the execution of a query/mutation.
 *
 * The following code block explains the execution as a flow diagram in the comments.
 * ```graphql
 *  query {  # o -> traverse()
 *      findUser(id: 12) {  # -> traverseField() -> traverseFuncField() -> traverse()
 *          username  # -> traverseField() -> traverseValueField()
 *          email # -> traverseField() -> traverseValueField()
 *      }
 *  }
 * ```
 */
export class Planner {
  rawArgs: Record<string, ComputeArg> = {};

  constructor(
    readonly operation: ast.OperationDefinitionNode,
    readonly fragments: FragmentDefs,
    private readonly tg: TypeGraph,
    private readonly verbose: boolean,
  ) {}

  getPlan(): Plan {
    const rootIdx =
      this.tg.type(0, Type.OBJECT).properties[this.operation.operation];
    ensure(
      rootIdx != null,
      `operation '${this.operation.operation}' is not available`,
    );

    // traverse on the root node: parent, parentStage and node stage are undefined
    const stages = this.traverse({
      name: this.operation.name?.value ?? "",
      path: [],
      selectionSet: this.operation.selectionSet,
      args: [],
      typeIdx: rootIdx,
    });

    const varTypes: Record<string, string> =
      (this.operation?.variableDefinitions ?? []).reduce(
        (agg, { variable, type }) => ({
          ...agg,
          [variable.name.value]: unparse(type.loc!),
        }),
        {} as Record<string, string>,
      );

    for (const stage of stages) {
      stage.varTypes = varTypes;
    }

    const policies = this.tg.preparePolicies(stages);
    return { stages, policies, policyArgs: this.policyArgs(stages) };
  }

  /**
   * Create child `ComputeStage`s for `node`
   * @param node
   * @param stage `ComputeStage` for `node`
   */
  private traverse(
    node: Node,
    stage?: ComputeStage,
  ): ComputeStage[] {
    const { name, selectionSet, args, typeIdx } = node;
    const typ = this.tg.type(typeIdx);
    const stages: ComputeStage[] = [];

    const selection = selectionSet
      ? resolveSelection(selectionSet, this.fragments)
      : [];
    const props = (typ.type === Type.OBJECT && typ.properties) || {};

    // TODO: use logger
    this.verbose &&
      console.log(
        this.tg.root.title,
        name,
        args.map((n) => n.name?.value),
        selection.map((n) => n.name?.value),
        typ.type,
        Object.entries(props).reduce(
          (agg, [k, v]) => ({ ...agg, [k]: this.tg.type(v).type }),
          {},
        ),
      );

    if (typ.type === Type.OBJECT && selection.length < 1) {
      throw new Error(`struct '${name}' must be a field selection`);
    }

    for (const field of selection) {
      const {
        name: { value: name },
        alias: { value: alias } = {},
        arguments: args,
      } = field;
      const path = [...node.path, name ?? alias];
      const fieldIdx = props[name];
      if (
        fieldIdx == undefined &&
        !(name === "__schema" || name === "__type" || name === "__typename")
      ) {
        const suggestions = Object.keys(props).join(", ");
        const formattedPath = this.formatPath(node.path);
        throw new Error(
          `'${name}' not found at '${formattedPath}', available names are: ${suggestions}`,
        );
      }
      const childNode = {
        parent: node,
        name: name ?? alias,
        path,
        selectionSet: field.selectionSet,
        args: args ?? [],
        typeIdx: props[name],
        parentStage: stage,
      };
      stages.push(...this.traverseField(childNode, field));
    }

    return stages;
  }

  /**
   * Create compute stages for `node` and its child nodes.
   * @param field {FieldNode} The selection field for node
   * @param node
   */
  private traverseField(
    node: Node,
    field: ast.FieldNode,
  ): ComputeStage[] {
    const { parent, path, name } = node;
    const policies: Record<string, string[]> = {};

    if (parent == null) {
      throw new Error("Expected parent node to be non-null");
    }

    if (
      path.length === 1 && this.tg.introspection &&
      (name === "__schema" || name === "__type")
    ) {
      const introspection = new Planner(
        this.operation,
        this.fragments,
        this.tg.introspection,
        this.verbose,
      );
      const root = this.tg.introspection.type(0, Type.OBJECT);

      // traverse on the root node: parent, parentStage and node stage are undefined
      return introspection.traverse({
        name: parent.name,
        path: [],
        args: parent.args,
        selectionSet: { kind: Kind.SELECTION_SET, selections: [field] },
        typeIdx: root.properties["query"],
      }).map((stage) => {
        stage.props.rateWeight = 0;
        return stage;
      });
    }

    // typename case
    if (name === "__typename") {
      const { args } = node;
      if (args && args.length > 0) {
        throw new Error(
          `'__typename' cannot have args ${JSON.stringify(args)}`,
        );
      }

      const outType = this.tg.type(parent.typeIdx);
      return [
        new ComputeStage({
          operationType: this.operation.operation,
          operationName: this.operationName,
          dependencies: [],
          parent: parent.parentStage,
          args: {},
          policies,
          outType: TypeGraph.typenameType,
          runtime: DenoRuntime.getDefaultRuntime(this.tg.name),
          batcher: this.tg.nextBatcher(outType),
          node: name,
          path,
          rateCalls: true,
          rateWeight: 0,
        }),
      ];
    }

    const fieldType = this.tg.type(node.typeIdx);
    const checksField = fieldType.policies.map((p) => this.tg.policy(p).name);
    if (checksField.length > 0) {
      policies[fieldType.title] = checksField;
    }

    if (fieldType.type !== Type.FUNCTION) {
      return this.traverseValueField(node, policies);
    }

    return this.traverseFuncField(
      node,
      policies,
      this.tg.type(parent.typeIdx, Type.OBJECT).properties,
    );
  }

  /**
   * Create `ComputeStage`s for `node` and its child nodes,
   * where `node` corresponds to a selection field for a value (non-function type).
   * @param node
   * @param policies
   */
  private traverseValueField(
    node: Node,
    policies: Record<string, any>,
  ): ComputeStage[] {
    const stages = [];
    const schema = this.tg.type(node.typeIdx);

    const { args = TypeGraph.emptyArgs, path } = node;
    if (args.length > 0) {
      const argNames = args.map((arg) => arg.name.value);
      throw Error(
        `unexpected args at '${this.formatPath(path)}': ${argNames.join(", ")}`,
      );
    }

    const runtime = this.tg.runtimeReferences[schema.runtime];

    const stage = this.createComputeStage(node, {
      dependencies: node.parentStage ? [node.parentStage.id()] : [],
      args: {},
      policies,
      runtime,
      batcher: this.tg.nextBatcher(schema),
      rateCalls: true,
      rateWeight: 0,
    });

    stages.push(stage);

    if (schema.type === Type.OBJECT) {
      stages.push(...this.traverse(node, stage));
      return stages;
    }

    // TODO support for nested quantifiers
    // What nested quantifiers should be supported: t.optional(t.optional(...)), ...
    if (isQuantifier(schema)) {
      const itemTypeIdx = getWrappedType(schema);
      const itemSchema = this.tg.type(itemTypeIdx);

      if (itemSchema.type === Type.OBJECT) {
        stages.push(...this.traverse({ ...node, typeIdx: itemTypeIdx }, stage));
      }
      return stages;
    }

    return stages;
  }

  /**
   * Create `ComputeStage`s for `node and its child nodes,
   * where `node` corresponds to a selection field for a function.
   */
  private traverseFuncField(
    node: Node,
    policies: Record<string, string[]>,
    parentProps: Record<string, number>,
  ): ComputeStage[] {
    const stages: ComputeStage[] = [];
    const deps = [];
    if (node.parentStage) {
      deps.push(node.parentStage.id());
    }

    const schema = this.tg.type(node.typeIdx, Type.FUNCTION);
    const { input: inputIdx, output: outputIdx, rate_calls, rate_weight } =
      schema;
    const outputType = this.tg.type(outputIdx);
    const checks = outputType.policies.map((p) => this.tg.policy(p).name);
    if (checks.length > 0) {
      policies[outputType.title] = checks;
    }

    const args: Record<string, ComputeArg> = {};
    const argSchema = this.tg.type(inputIdx, Type.OBJECT);
    const argNodes = (node.args ?? [])
      .reduce(
        (agg, fieldArg) => ({ ...agg, [fieldArg.name.value]: fieldArg }),
        {} as Record<string, ast.ArgumentNode>,
      );

    const argumentCollector = new ArgumentCollector(this.tg);
    const nestedDepsUnion = [];
    for (
      const [argName, argIdx] of Object.entries(argSchema.properties ?? {})
    ) {
      const nested = argumentCollector.collectArg(
        argNodes[argName],
        argIdx,
        parentProps,
      );

      nestedDepsUnion.push(...nested.deps);
      args[argName] = nested.compute;
      Object.assign(policies, nested.policies);
    }

    // check that no unwanted arg is given
    for (const arg of node.args ?? []) {
      const name = arg.name.value;
      if (!(name in args)) {
        throw Error(
          `'${name}' unexpected input at '${this.formatPath(node.path)}'`,
        );
      }
    }

    deps.push(
      ...Array.from(new Set(nestedDepsUnion)).map((dep) =>
        [...node.path, dep].join(".")
      ),
    );

    const mat = this.tg.materializer(schema.materializer);
    const runtime = this.tg.runtimeReferences[mat.runtime];
    if (this.operation.operation === "query" && mat.data.serial) {
      throw new Error(
        `'${schema.title}' via '${mat.name}' can only be executed in mutation`,
      );
    }

    const stage = this.createComputeStage(node, {
      dependencies: deps,
      args,
      policies,
      argumentNodes: node.args,
      inpType: argSchema,
      outType: outputType,
      runtime,
      materializer: mat,
      batcher: this.tg.nextBatcher(outputType),
      rateCalls: rate_calls,
      rateWeight: (rate_weight as number ?? 0), // `as number` does not promote null or undefined to a number
    });
    stages.push(stage);

    if (outputType.type === Type.OBJECT) {
      stages.push(
        ...this.traverse(
          { ...node, typeIdx: outputIdx, parentStage: stage },
          stage,
        ),
      );
      return stages;
    }

    if (isQuantifier(outputType)) {
      let wrappedTypeIdx: number = getWrappedType(outputType);
      let wrappedType = this.tg.type(wrappedTypeIdx);
      while (isQuantifier(wrappedType)) {
        wrappedTypeIdx = getWrappedType(wrappedType);
        wrappedType = this.tg.type(wrappedTypeIdx);
      }

      if (wrappedType.type === Type.OBJECT) {
        stages.push(
          ...this.traverse({
            ...node,
            typeIdx: wrappedTypeIdx,
            parentStage: stage,
          }, stage),
        );
      }
    }

    return stages;
  }

  get operationName(): string {
    // Unnamed queries/mutations will be named "Q"/"M"
    return this.operation.name?.value ??
      this.operation.operation.charAt(0).toUpperCase();
  }

  /**
   * Create a `ComputeStage` from `node` and the additional props.
   */
  private createComputeStage(
    node: Node,
    props:
      & Omit<
        ComputeStageProps,
        | "operationType"
        | "operationName"
        | "outType"
        | "node"
        | "path"
        | "parent"
      >
      & Partial<Pick<ComputeStageProps, "outType">>,
  ): ComputeStage {
    return new ComputeStage({
      operationType: this.operation.operation,
      operationName: this.operationName,
      outType: this.tg.type(node.typeIdx),
      node: node.name,
      path: node.path,
      parent: node.parentStage,
      ...props,
    });
  }

  private formatPath(path: string[]) {
    return [this.operationName, ...path].join(".");
  }

  /** Create a function that will be used to compute the args for the policies. */
  private policyArgs(
    stages: ComputeStage[],
  ): FromVars<Record<string, Record<string, unknown>>> {
    const computes: Record<string, FromVars<Record<string, unknown>>> = {};
    for (const stage of stages) {
      const args = stage.props.args;
      if (Object.keys(args).length === 0) {
        continue;
      }
      const key = stage.props.path.join(".");
      computes[key] = (vars) => mapValues(args, (c) => c(vars, null, null));
    }

    return (vars) =>
      filterValues(
        mapValues(computes, (c) => c(vars)),
        (v) => v != undefined,
      );
  }
}
