// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import * as ast from "graphql/ast";
import { Kind } from "graphql";
import { ComputeStage } from "./engine.ts";
import { FragmentDefs, resolveSelection } from "./graphql.ts";
import { TypeGraph } from "./typegraph.ts";
import {
  ComputeArg,
  ComputeStageProps,
  Operation,
  PolicyStagesFactory,
} from "./types.ts";
import { getWrappedType, isQuantifier, Type } from "./type_node.ts";
import { DenoRuntime } from "./runtimes/deno.ts";
import { ensure, unparse } from "./utils.ts";

interface Node {
  name: string;
  path: string[];
  selectionSet?: ast.SelectionSetNode;
  args: readonly ast.ArgumentNode[];
  typeIdx: number;
  parent: Node | undefined;
  parentStage: ComputeStage | undefined;
}

export class Planner {
  constructor(
    readonly operation: ast.OperationDefinitionNode,
    readonly fragments: FragmentDefs,
    private tg: TypeGraph,
    private verbose: boolean,
  ) {}

  getPlan(): [ComputeStage[], PolicyStagesFactory] {
    const rootIdx =
      this.tg.type(0, Type.OBJECT).properties[this.operation.operation];
    ensure(
      rootIdx != null,
      `operation '${this.operation.operation}' is not available`,
    );

    const stages = this.traverse({
      parent: undefined,
      name: this.operation.name?.value ?? "",
      path: [],
      selectionSet: this.operation.selectionSet,
      args: [],
      typeIdx: rootIdx,
      parentStage: undefined,
    }, undefined);

    const varTypes: Record<string, string> =
      (this.operation?.variableDefinitions ?? []).reduce(
        (agg, { variable, type }) => ({
          ...agg,
          [variable.name.value]: unparse(type.loc!),
        }),
        {},
      );

    for (const stage of stages) {
      stage.varTypes = varTypes;
    }

    const policies = this.tg.preparePolicies(stages);
    return [stages, policies];
  }

  // TODO private
  traverse(node: Node, stage: ComputeStage | undefined): ComputeStage[] {
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
      if (fieldIdx == undefined) {
        const suggestions = Object.keys(props).join(", ");
        const formattedPath = this.formatPath(path);
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
      stages.push(...this.traverseField(field, childNode));
    }

    return stages;
  }

  // TODO no return; addStage(s, ...)
  private traverseField(
    field: ast.FieldNode,
    node: Node,
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
      const root = this.tg.introspection.type(0, "object");
      return this.tg.introspection.traverse(
        this.fragments,
        parent.name,
        parent.args,
        { kind: Kind.SELECTION_SET, selections: [field] },
        this.verbose,
        [],
        root.properties["query"],
      ).map((stage) => {
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
          operation: this.operationProp,
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

    // TODO why these branches?
    if (schema.type === Type.OPTIONAL) {
      const itemTypeIdx = schema.item;
      const itemSchema = this.tg.type(itemTypeIdx);
      if (itemSchema.type === Type.ARRAY) {
        const arrayItemTypeIdx = itemSchema.items;
        const arrayItemSchema = this.tg.type(arrayItemTypeIdx);

        // TODO why??
        if (arrayItemSchema.type === Type.STRING) {
          stages.push(...this.traverse({
            ...node,
            typeIdx: arrayItemTypeIdx,
          }, stage));
        }

        return stages;
      }
    }

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

    const nestedDepsUnion = [];
    for (
      const [argName, argIdx] of Object.entries(argSchema.properties ?? {})
    ) {
      const nested = this.tg.collectArg(argNodes[argName], argIdx, parentProps);
      if (!nested) {
        continue;
      }

      const [value, inputPolicies, nestedDeps] = nested;
      nestedDepsUnion.push(...nestedDeps);
      args[argName] = value;
      policies = { ...policies, ...inputPolicies };
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
      rateWeight: rate_weight as number, // FIXME waht is the right type?
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

  get operationProp(): Operation {
    const op = this.operation.operation;

    // TODO: no mapping -- forward the value
    const type = (() => {
      switch (op) {
        case ast.OperationTypeNode.QUERY:
          return "Query";
        case ast.OperationTypeNode.MUTATION:
          return "Mutation";
        default:
          throw new Error(`Unsupported operation type '${op}'`);
      }
    })();
    return {
      type,
      name: this.operation.name?.value ?? type[0],
    };
  }

  get operationName(): string {
    return this.operation.name?.value ??
      this.operation.operation.charAt(0).toUpperCase();
  }

  createComputeStage(
    node: Node,
    props:
      & Omit<
        ComputeStageProps,
        "operation" | "outType" | "node" | "path" | "parent"
      >
      & Partial<Pick<ComputeStageProps, "outType">>,
  ): ComputeStage {
    return new ComputeStage({
      operation: this.operationProp,
      outType: this.tg.type(node.typeIdx),
      node: node.name,
      path: node.path,
      parent: node.parentStage,
      ...props,
    });
  }

  formatPath(path: string[]) {
    return [this.operationName, ...path].join(".");
  }
}
