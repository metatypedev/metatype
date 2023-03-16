// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import * as ast from "graphql/ast";
import { Kind } from "graphql";
import { ComputeStage } from "../engine.ts";
import { FragmentDefs, resolveSelection } from "../graphql.ts";
import { TypeGraph } from "../typegraph.ts";
import { ComputeStageProps } from "../types.ts";
import {
  getWrappedType,
  isArray,
  isObject,
  isQuantifier,
  Type,
} from "../type_node.ts";
import { DenoRuntime } from "../runtimes/deno.ts";
import { ensure, unparse } from "../utils.ts";
import { collectArgs, ComputeArg } from "./args.ts";
import { OperationPolicies, OperationPoliciesBuilder } from "./policies.ts";
import { getLogger } from "../log.ts";
const logger = getLogger(import.meta);

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
  policies: OperationPolicies;
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
  policiesBuilder: OperationPoliciesBuilder;

  constructor(
    readonly operation: ast.OperationDefinitionNode,
    readonly fragments: FragmentDefs,
    private readonly tg: TypeGraph,
    private readonly verbose: boolean,
  ) {
    this.policiesBuilder = new OperationPoliciesBuilder(tg);
  }

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

    return {
      stages,
      policies: this.policiesBuilder.build(),
    };
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

    this.verbose &&
      logger.debug(
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
      // name: used to fetch the value
      // canonicalName: field name on the expected output
      const canonicalName = alias ?? name;
      const path = [...node.path, canonicalName];
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
        name: canonicalName,
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
          args: null,
          outType: TypeGraph.typenameType,
          typeIdx: parent.typeIdx,
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

    if (fieldType.type !== Type.FUNCTION) {
      return this.traverseValueField(node);
    }

    return this.traverseFuncField(
      node,
      this.tg.type(parent.typeIdx, Type.OBJECT).properties,
    );
  }

  /**
   * Create `ComputeStage`s for `node` and its child nodes,
   * where `node` corresponds to a selection field for a value (non-function type).
   * @param node
   * @param policies
   */
  private traverseValueField(node: Node): ComputeStage[] {
    const stages: ComputeStage[] = [];
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
      args: null,
      runtime,
      batcher: this.tg.nextBatcher(schema),
      rateCalls: true,
      rateWeight: 0,
    });
    const types = this.policiesBuilder.setReferencedTypes(
      stage.id(),
      node.typeIdx,
    );

    stages.push(stage);

    if (schema.type === Type.OBJECT) {
      stages.push(...this.traverse(node, stage));
      return stages;
    }

    // TODO support for nested quantifiers
    // What nested quantifiers should be supported: t.optional(t.optional(...)), ...
    if (isQuantifier(schema)) {
      const itemTypeIdx = getWrappedType(schema);
      types.push(itemTypeIdx);
      const itemSchema = this.tg.type(itemTypeIdx);

      if (itemSchema.type === Type.OBJECT) {
        stages.push(...this.traverse({ ...node, typeIdx: itemTypeIdx }, stage));
      }

      // support for nested quantifier `t.array(t.struct()).optional()`,
      // which is necessary to compute some introspection fields
      if (isArray(itemSchema)) {
        const nestedItemTypeIndex = getWrappedType(itemSchema);
        types.push(nestedItemTypeIndex);
        const nestedItemNode = this.tg.type(nestedItemTypeIndex);

        if (isObject(nestedItemNode)) {
          stages.push(
            ...this.traverse(
              { ...node, typeIdx: nestedItemTypeIndex },
              stage,
            ),
          );
        }
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

    const mat = this.tg.materializer(schema.materializer);
    const runtime = this.tg.runtimeReferences[mat.runtime];
    if (this.operation.operation === "query" && mat.effect.effect != null) {
      throw new Error(
        `'${schema.title}' via '${mat.name}' can only be executed in mutation`,
      );
    }

    const argSchema = this.tg.type(inputIdx, Type.OBJECT);
    const argNodes = (node.args ?? []).reduce(
      (agg, fieldArg) => ({ ...agg, [fieldArg.name.value]: fieldArg }),
      {} as Record<string, ast.ArgumentNode>,
    );

    const collected = collectArgs(
      this.tg,
      node.path.join("."),
      mat.effect.effect ?? "none",
      parentProps,
      inputIdx,
      argNodes,
    );

    deps.push(
      ...collected.deps.map((dep) => [...node.path, dep].join(".")),
    );

    const stage = this.createComputeStage(node, {
      dependencies: deps,
      args: collected.compute,
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

    this.policiesBuilder.push(
      stage.id(),
      node.typeIdx,
      collected.policies,
    );
    const types = this.policiesBuilder.setReferencedTypes(
      stage.id(),
      node.typeIdx,
      outputIdx,
      inputIdx,
    );

    if (outputType.type === Type.OBJECT) {
      stages.push(
        ...this.traverse(
          { ...node, typeIdx: outputIdx, parentStage: stage },
          stage,
        ),
      );
      this.policiesBuilder.pop(stage.id());
      return stages;
    }

    if (isQuantifier(outputType)) {
      let wrappedTypeIdx: number = getWrappedType(outputType);
      types.push(wrappedTypeIdx);
      let wrappedType = this.tg.type(wrappedTypeIdx);
      while (isQuantifier(wrappedType)) {
        wrappedTypeIdx = getWrappedType(wrappedType);
        types.push(wrappedTypeIdx);
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

    this.policiesBuilder.pop(stage.id());
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
        | "typeIdx"
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
      typeIdx: node.typeIdx,
      ...props,
    });
  }

  private formatPath(path: string[]) {
    return [this.operationName, ...path].join(".");
  }
}
