// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import * as ast from "graphql/ast";
import { FieldNode, Kind } from "graphql";
import { ComputeStage } from "../engine.ts";
import { FragmentDefs, resolveSelection } from "../graphql.ts";
import { TypeGraph } from "../typegraph.ts";
import { ComputeStageProps } from "../types.ts";
import { getReverseMapNameToQuery } from "../utils.ts";
import { getWrappedType, isQuantifier, Type, UnionNode } from "../type_node.ts";
import { DenoRuntime } from "../runtimes/deno/deno.ts";
import { closestWord, ensure, unparse } from "../utils.ts";
import { collectArgs, ComputeArg } from "./args.ts";
import { OperationPolicies, OperationPoliciesBuilder } from "./policies.ts";
import { getLogger } from "../log.ts";
import { EitherNode } from "../types/typegraph.ts";
const logger = getLogger(import.meta);
import { generateVariantMatcher } from "../typecheck/matching_variant.ts";

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

    if (selectionSet == null) {
      if (this.isSelectionSetExpectedFor(typeIdx)) {
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

      for (const field of selection) {
        stages.push(
          ...this.traverseField(
            this.getChildNodeForField(field, node, props, stage),
            field,
          ),
        );
      }

      return stages;
    }

    if (typ.type === Type.EITHER || typ.type === Type.UNION) {
      const stages: ComputeStage[] = [];
      const variants = this.getNestedVariantsByName(typ);
      const unselectedVariants = new Set(Object.keys(variants));
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

      stage!.props.childSelection = generateVariantMatcher(this.tg, typeIdx);

      for (const [typeName, selectionSet] of selections) {
        const selection = resolveSelection(selectionSet, this.fragments);
        const props = this.tg.type(variants[typeName], Type.OBJECT).properties;
        const parentPath = node.path.slice();
        parentPath[parentPath.length - 1] += `$${typeName}`;
        for (const field of selection) {
          stages.push(
            ...this.traverseField(
              this.getChildNodeForField(
                field,
                { ...node, path: parentPath },
                props,
                stage,
              ),
              field,
            ),
          );
        }
      }

      return stages;
    }

    // unreachable
    throw new Error();
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
    return {
      parent: node,
      name: canonicalName,
      path,
      selectionSet: field.selectionSet,
      args: args ?? [],
      typeIdx: props[name],
      parentStage,
    };
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
          effect: null,
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

    const stages = fieldType.type !== Type.FUNCTION
      ? this.traverseValueField(node)
      : this.traverseFuncField(
        node,
        this.tg.type(parent.typeIdx, Type.OBJECT).properties,
      );

    return stages;
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
      effect: null,
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

    // nested quantifiers
    let nestedTypeIdx = node.typeIdx;
    let nestedSchema = this.tg.type(nestedTypeIdx);
    while (isQuantifier(nestedSchema)) {
      nestedTypeIdx = getWrappedType(nestedSchema);
      nestedSchema = this.tg.type(nestedTypeIdx);
      types.push(nestedTypeIdx);
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
    const { input: inputIdx, output: outputIdx, rate_calls, rate_weight } =
      schema;
    const outputType = this.tg.type(outputIdx);

    const mat = this.tg.materializer(schema.materializer);
    const effect = mat.effect.effect ?? null;
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
      effect,
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

    // nested quantifiers
    let wrappedTypeIdx = outputIdx;
    let wrappedType = this.tg.type(wrappedTypeIdx);
    while (isQuantifier(wrappedType)) {
      wrappedTypeIdx = getWrappedType(wrappedType);
      wrappedType = this.tg.type(wrappedTypeIdx);
      types.push(wrappedTypeIdx);
    }

    stages.push(
      ...this.traverse(
        { ...node, typeIdx: wrappedTypeIdx, parentStage: stage },
        stage,
      ),
    );

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

  private isSelectionSetExpectedFor(typeIdx: number): boolean {
    const typ = this.tg.type(typeIdx);
    if (typ.type === Type.OBJECT) {
      return true;
    }

    if (typ.type === Type.UNION) {
      // only check for first variant
      // typegraph validation ensure that all the (nested) variants are all either objects or scalars
      return this.isSelectionSetExpectedFor(typ.anyOf[0]);
    }
    if (typ.type === Type.EITHER) {
      return this.isSelectionSetExpectedFor(typ.oneOf[0]);
    }
    return false;
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

  private getNestedVariantsByName(
    typ: UnionNode | EitherNode,
  ): Record<string, number> {
    const getEntries = (
      typ: UnionNode | EitherNode,
    ): Array<[string, number]> => {
      const variants = typ.type === Type.UNION ? typ.anyOf : typ.oneOf;
      return variants.flatMap((idx) => {
        const typeNode = this.tg.type(idx);
        if (typeNode.type === Type.EITHER || typeNode.type === Type.UNION) {
          return getEntries(typeNode);
        }
        return [[typeNode.title, idx]];
      });
    };
    return Object.fromEntries(getEntries(typ));
  }
}
