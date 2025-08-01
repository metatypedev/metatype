// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type * as ast from "graphql/ast";
import { type FieldNode, Kind } from "graphql";
import { ComputeStage } from "../query_engine.ts";
import {
  type FragmentDefs,
  resolveSelection,
} from "../../transports/graphql/graphql.ts";
import { TypeGraph } from "../../typegraph/mod.ts";
import type { ComputeStageProps } from "../../types.ts";
import { ensureNonNullable, getReverseMapNameToQuery } from "../../utils.ts";
import {
  getWrappedType,
  isQuantifier,
  Type,
} from "../../typegraph/type_node.ts";
import { closestWord, unparse } from "../../utils.ts";
import { collectArgs, type ComputeArg } from "./args.ts";
import { OperationPolicies, type StageMetadata } from "./policies.ts";
import { getLogger } from "../../log.ts";
import { generateVariantMatcher } from "../typecheck/matching_variant.ts";
import { mapValues } from "@std/collections/map-values";
import { DependencyResolver } from "./dependency_resolver.ts";
import type { Runtime } from "../../runtimes/Runtime.ts";
import { getInjection } from "../../typegraph/utils.ts";
import type { Injection } from "../../typegraph/types.ts";

const logger = getLogger(import.meta);

interface Scope {
  runtime: Runtime;
  fnIdx: number;
  path: string[];
}

interface Node {
  name: string;
  path: string[];
  selectionSet?: ast.SelectionSetNode;
  args: readonly ast.ArgumentNode[];
  typeIdx: number;
  parent?: Node;
  parentStage?: ComputeStage;
  scope?: Scope;
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

  constructor(
    readonly operation: ast.OperationDefinitionNode,
    readonly fragments: FragmentDefs,
    private readonly tg: TypeGraph,
    private readonly verbose: boolean,
  ) {
  }

  getPlan(): Plan {
    const rootIdx = this.tg.type(0, Type.OBJECT).properties[
      this.operation.operation
    ];
    ensureNonNullable(
      rootIdx,
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

    const varTypes: Record<string, string> = (
      this.operation?.variableDefinitions ?? []
    ).reduce(
      (agg, { variable, type }) => ({
        ...agg,
        [variable.name.value]: unparse(type.loc!),
      }),
      {} as Record<string, string>,
    );

    const orderedStageMetadata = [] as Array<StageMetadata>;
    for (const stage of stages) {
      stage.varTypes = varTypes;
      const stageId = stage.id();
      if (stageId.startsWith("__")) {
        // TODO: allow and reuse previous stage policy?
        continue;
      }

      orderedStageMetadata.push({
        stageId,
        typeIdx: stage.props.typeIdx,
        isTopLevel: stage.props.parent ? false : true,
        node: stage.props.node, // actual non aliased name
      });
    }

    const { timer_policy_eval_retries } = this.tg.typegate.config.base;
    const operationPolicies = new OperationPolicies(
      this.tg,
      orderedStageMetadata,
      {
        timer_policy_eval_retries,
      },
    );

    return {
      stages,
      policies: operationPolicies,
    };
  }

  /**
   * Create child `ComputeStage`s for `node`
   * @param node
   * @param stage `ComputeStage` for `node`
   */
  private traverse(node: Node, stage?: ComputeStage): ComputeStage[] {
    const { name, selectionSet, args, typeIdx } = node;
    const typ = this.tg.type(typeIdx);

    if (selectionSet == null) {
      if (this.tg.isSelectionSetExpectedFor(typeIdx)) {
        const path = this.formatPath(node.path);
        throw new Error(
          `at ${path}: selection set is expected for object type`,
        );
      }
      return [];
    }

    if (typ.type === Type.OBJECT) {
      const selection = resolveSelection(selectionSet, this.fragments);
      const props = (typ.type === Type.OBJECT && typ.properties) || {};
      const stages: ComputeStage[] = [];

      this.verbose &&
        logger.debug(`planning stages`, {
          tgName: this.tg.root.title,
          name,
          args: args.map((n) => n.name?.value),
          selection: selection.map((n) => n.name?.value),
          type: typ.type,
          props: Object.entries(props).reduce(
            (agg, [k, v]) => ({ ...agg, [k]: this.tg.type(v).type }),
            {},
          ),
        });

      stages.push(
        ...new DependencyResolver(
          this.tg,
          stage?.id() ?? null,
          typ,
          (field) =>
            this.traverseField(
              this.getChildNodeForField(field, node, props, stage),
              field,
            ),
          selection,
        ).getScheduledStages(),
      );

      return stages;
    }

    if (typ.type === Type.EITHER || typ.type === Type.UNION) {
      const stages: ComputeStage[] = [];
      const variants = this.tg.typeUtils.getFlatUnionVariants(typ);
      const selectableVariants = new Map(
        variants.flatMap((idx) => {
          const typeNode = this.tg.type(idx);
          if (this.tg.typeUtils.isScalarOrListOfScalars(typeNode)) {
            return [];
          } else {
            return [[typeNode.title, idx]];
          }
        }),
      );
      const unselectedVariants = new Set(selectableVariants.keys());
      if (unselectedVariants.size === 0 && selectionSet.selections.length > 0) {
        const path = this.formatPath(node.path);
        throw new Error(`at ${path}: Unexpected selections`);
      }

      // expect selections to be inline fragments with type conditions
      const selections = selectionSet.selections.map((sel) => {
        if (sel.kind !== Kind.INLINE_FRAGMENT || sel.typeCondition == null) {
          throw new Error("Expected inline fragment with type condition");
        }
        const typeName = sel.typeCondition.name.value;
        if (!unselectedVariants.has(typeName)) {
          const path = this.formatPath(node.path);
          const suggestions = [...unselectedVariants].join(", ");
          throw new Error(
            `at: ${path}: Unknown type condition '${typeName}'; available types are: ${suggestions}`,
          );
        }
        unselectedVariants.delete(typeName);
        return [typeName, sel.selectionSet] as const;
      });

      if (unselectedVariants.size > 0) {
        const path = this.formatPath;
        const s = unselectedVariants.size > 0 ? "s" : "";
        const variants = [...unselectedVariants].join(", ");
        throw new Error(
          `at ${path}: Unselected union variant${s}: ${variants}`,
        );
      }

      ensureNonNullable(stage, "unexpected");

      stage.props.childSelection = generateVariantMatcher(this.tg, typ);

      for (const [typeName, selectionSet] of selections) {
        const selection = resolveSelection(selectionSet, this.fragments);
        // TODO eventually wrapped in a quantifier?
        const idx = selectableVariants.get(typeName);
        if (idx == null) {
          // TODO error message: or not selectable variant?
          throw new Error(`unknown variant '${typeName}'`);
        }
        const outputType = this.tg.type(idx, Type.OBJECT);
        const parentPath = node.path.slice();
        parentPath[parentPath.length - 1] += `$${typeName}`;
        stages.push(
          ...new DependencyResolver(
            this.tg,
            parentPath.join("."),
            outputType,
            (field) =>
              this.traverseField(
                this.getChildNodeForField(
                  field,
                  {
                    ...node,
                    path: parentPath,
                    typeIdx: idx,
                    parentStage: stage,
                  },
                  outputType.properties,
                  stage,
                ),
                field,
              ),
            selection,
          ).getScheduledStages(),
        );
      }

      return stages;
    }

    const path = this.formatPath(node.path);
    throw new Error(
      `at ${path}: Unexpected selection set for type '${typ.type}'`,
    );
  }

  private getChildNodeForField(
    field: FieldNode,
    node: Node,
    props: Record<string, number>,
    parentStage?: ComputeStage,
  ) {
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
      throw this.unexpectedFieldError(node, name);
    }
    const fieldType = fieldIdx == null ? null : this.tg.type(fieldIdx);
    const scope: Scope | undefined =
      (fieldType && fieldType.type === Type.FUNCTION)
        ? {
          runtime: this.tg
            .runtimeReferences[
              this.tg.materializer(fieldType.materializer).runtime
            ],
          fnIdx: fieldIdx,
          path: [],
        }
        : node.scope && { ...node.scope, path: [...node.scope.path, name] };

    return {
      parent: node,
      name,
      path,
      selectionSet: field.selectionSet,
      args: args ?? [],
      typeIdx: props[name],
      parentStage,
      scope,
    };
  }

  #getOutjection(scope: Scope): Injection | null {
    const outjectionTree =
      this.tg.type(scope.fnIdx, Type.FUNCTION).outjections ??
        {};
    return getInjection(outjectionTree, scope.path);
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
      path.length === 1 &&
      this.tg.introspection &&
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
      return introspection
        .traverse({
          name: parent.name,
          path: [],
          args: parent.args,
          selectionSet: { kind: Kind.SELECTION_SET, selections: [field] },
          typeIdx: root.properties["query"],
        })
        .map((stage) => {
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
          effect: null,
          typeIdx: parent.typeIdx,
          runtime: this.tg.runtimeReferences[this.tg.denoRuntimeIdx],
          batcher: this.tg.nextBatcher(outType),
          node: name,
          path,
          rateCalls: true,
          rateWeight: 0,
        }),
      ];
    }

    const fieldType = this.tg.type(node.typeIdx);
    const stages = fieldType.type !== Type.FUNCTION
      ? this.traverseValueField(node)
      : this.traverseFuncField(
        node,
        this.tg.type(parent.typeIdx, Type.OBJECT).properties,
      );

    return stages;
  }

  #createOutjectionStage(node: Node, outjection: Injection): ComputeStage {
    return this.createComputeStage(node, {
      // TODO parent if from parent
      dependencies: [],
      args: null,
      effect: null,
      runtime: this.tg.runtimeReferences[this.tg.denoRuntimeIdx],
      batcher: this.tg.nextBatcher(this.tg.type(node.typeIdx)),
      rateCalls: true,
      rateWeight: 0,
      materializer: {
        runtime: this.tg.denoRuntimeIdx,
        name: "outjection",
        data: outjection,
        effect: { effect: null, idempotent: true },
      },
    });
  }

  /**
   * Create `ComputeStage`s for `node` and its child nodes,
   * where `node` corresponds to a selection field for a value (non-function type).
   * @param node
   */
  private traverseValueField(
    node: Node,
  ): ComputeStage[] {
    const outjection = node.scope && this.#getOutjection(node.scope!);
    if (outjection) {
      return [
        this.#createOutjectionStage(node, outjection),
      ];
    }
    const stages: ComputeStage[] = [];
    const schema = this.tg.type(node.typeIdx);

    const { args = TypeGraph.emptyArgs, path } = node;
    if (args.length > 0) {
      const argNames = args.map((arg) => arg.name.value);
      throw Error(
        `unexpected args at '${this.formatPath(path)}': ${argNames.join(", ")}`,
      );
    }

    const runtime = node.scope?.runtime ??
      this.tg.runtimeReferences[this.tg.denoRuntimeIdx];

    const stage = this.createComputeStage(node, {
      dependencies: node.parentStage ? [node.parentStage.id()] : [],
      args: null,
      effect: null,
      runtime,
      batcher: this.tg.nextBatcher(schema),
      rateCalls: true,
      rateWeight: 0,
    });

    stages.push(stage);

    // nested quantifiers
    let nestedTypeIdx = node.typeIdx;
    let nestedSchema = this.tg.type(nestedTypeIdx);
    while (isQuantifier(nestedSchema)) {
      nestedTypeIdx = getWrappedType(nestedSchema);
      nestedSchema = this.tg.type(nestedTypeIdx);
    }

    stages.push(...this.traverse({ ...node, typeIdx: nestedTypeIdx }, stage));

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
    const {
      input: inputIdx,
      output: outputIdx,
      rate_calls,
      rate_weight,
    } = schema;
    const outputType = this.tg.type(outputIdx);

    const mat = this.tg.materializer(schema.materializer);
    const effect = mat.effect.effect ?? null;
    const runtime = this.tg.runtimeReferences[mat.runtime];
    if (
      this.operation.operation === "query" &&
      // TODO: effect should always be non-null
      mat.effect.effect != null &&
      mat.effect.effect != "read"
    ) {
      throw new Error(
        `'${schema.title}' via '${mat.name}' can only be executed in mutation`,
      );
    }

    const argNodes = (node.args ?? []).reduce(
      (agg, fieldArg) => ({ ...agg, [fieldArg.name.value]: fieldArg }),
      {} as Record<string, ast.ArgumentNode>,
    );

    const collected = collectArgs(
      this.tg,
      node.path.join("."),
      mat.effect.effect ?? "read",
      parentProps,
      schema,
      argNodes,
    );

    deps.push(...collected.deps);

    const inputType = this.tg.type(inputIdx, Type.OBJECT);
    const argumentTypes = mapValues(
      inputType.properties,
      (idx, key) =>
        this.tg.getGraphQLType(
          this.tg.type(idx),
          false,
          inputType.id?.includes(key) ?? false,
        ),
    );

    const stage = this.createComputeStage(node, {
      dependencies: deps,
      args: collected.compute,
      argumentTypes,
      outType: outputType,
      effect,
      runtime,
      materializer: mat,
      batcher: this.tg.nextBatcher(outputType),
      rateCalls: rate_calls,
      rateWeight: (rate_weight as number) ?? 0, // `as number` does not promote null or undefined to a number
    });
    stages.push(stage);

    // nested quantifiers
    let wrappedOutputIdx = outputIdx;
    let wrappedType = this.tg.type(wrappedOutputIdx);
    while (isQuantifier(wrappedType)) {
      wrappedOutputIdx = getWrappedType(wrappedType);
      wrappedType = this.tg.type(wrappedOutputIdx);
    }

    stages.push(
      ...this.traverse(
        { ...node, typeIdx: wrappedOutputIdx, parentStage: stage },
        stage,
      ),
    );

    return stages;
  }

  get operationName(): string {
    // Unnamed queries/mutations will be named "Q"/"M"
    return (
      this.operation.name?.value ??
        this.operation.operation.charAt(0).toUpperCase()
    );
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

  private unexpectedFieldError(node: Node, name: string): Error {
    const typ = this.tg.type(node.typeIdx, Type.OBJECT);
    const allProps = Object.keys(typ.properties);
    const formattedPath = this.formatPath(node.path);
    if (typ.title === "Mutation" || typ.title === "Query") {
      // propose which root type has that name
      const nameToPaths = getReverseMapNameToQuery(this.tg, [
        "mutation",
        "query",
      ]);
      if (nameToPaths.has(name)) {
        const rootPaths = [...nameToPaths.get(name)!];
        // Mutation or Query but never both
        if (rootPaths.length == 1) {
          const [suggestion] = rootPaths;
          return new Error(
            `'${name}' not found at '${formattedPath}', did you mean using '${name}' from '${suggestion}'?`,
          );
        }
      }
    }
    // if the above fails, tell the user in case they made a typo
    const suggestion = closestWord(name, allProps);
    if (suggestion) {
      return new Error(
        `'${name}' not found at '${formattedPath}', did you mean '${suggestion}'?`,
      );
    }
    const suggestions = allProps.join(", ");
    return new Error(
      `'${name}' not found at '${formattedPath}', available names are: ${suggestions}`,
    );
  }
}
