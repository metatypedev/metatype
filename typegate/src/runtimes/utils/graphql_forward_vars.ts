// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { ensure } from "../../utils.ts";
import { ComputeStage } from "../../engine.ts";
import { iterParentStages } from "../../utils.ts";
import {
  ArgumentNode,
  FieldNode,
  SelectionNode,
  VariableDefinitionNode,
} from "graphql/ast";
import { Kind, parseType } from "graphql";
import * as GraphQL from "graphql";

type Mutable<T> = { -readonly [P in keyof T]: T[P] };

const createField = (
  name: string,
  selectionSet: boolean,
  args: ReadonlyArray<ArgumentNode>,
) => {
  const additionalProps: Mutable<
    Pick<FieldNode, "selectionSet" | "arguments">
  > = {};
  if (selectionSet) {
    additionalProps.selectionSet = {
      kind: Kind.SELECTION_SET,
      selections: [],
    };
  }
  if (args.length > 0) {
    additionalProps.arguments = args;
  }
  return {
    kind: Kind.FIELD,
    name: {
      kind: Kind.NAME,
      value: name,
    },
    ...additionalProps,
  } as FieldNode;
};

const findOrCreateField = (
  selections: Array<FieldNode>,
  name: string,
  selectionSet: boolean,
  args: ReadonlyArray<ArgumentNode>,
) => {
  const found = selections.find((n) => n.name.value === name);
  if (found) {
    return found;
  }
  const created = createField(name, selectionSet, args);
  selections.push(created);
  return created;
};

const createTargetField = (
  origPath: readonly string[],
  rootSelections: ReadonlyArray<FieldNode>,
  selectionSet: boolean,
  args: ReadonlyArray<ArgumentNode>,
) => {
  const path = [...origPath];
  const last = path.pop()!;
  if (path.length > 0) {
    const first = path.shift()!;
    let field = findOrCreateField(
      rootSelections as Array<FieldNode>,
      first,
      true,
      [],
    );
    for (const p of path) {
      field = findOrCreateField(
        field.selectionSet!.selections as Array<FieldNode>,
        p,
        true,
        [],
      );
    }
    return findOrCreateField(
      field.selectionSet!.selections as Array<FieldNode>,
      last,
      selectionSet,
      args,
    );
  }
  return findOrCreateField(
    rootSelections as Array<FieldNode>,
    last,
    selectionSet,
    args,
  );
};

const createArgs = (
  argTypes: Record<string, string>,
): ReadonlyArray<ArgumentNode> => {
  return Object.keys(argTypes).map((name) => ({
    kind: Kind.ARGUMENT,
    name: { kind: Kind.NAME, value: name },
    value: {
      kind: Kind.VARIABLE,
      name: { kind: Kind.NAME, value: `_arg_${name}` },
    },
  }));
};

const createVarDef = (name: string, type: string): VariableDefinitionNode => {
  return {
    kind: Kind.VARIABLE_DEFINITION,
    variable: {
      kind: Kind.VARIABLE,
      name: {
        kind: Kind.NAME,
        value: name,
      },
    },
    type: parseType(type, { noLocation: true }),
  };
};

export interface RebuildQueryParam {
  stages: ComputeStage[];
  renames: Record<string, string>;
}

export interface RebuiltGraphQuery {
  selections: Array<FieldNode>;
  vars: Array<VariableDefinitionNode>;
}

export class QueryRebuilder {
  #rootSelections: Array<FieldNode> = [];
  #forwardedVars: Array<VariableDefinitionNode> = [];
  readonly #level: number;

  constructor(
    private stages: ComputeStage[],
    private renames: Record<string, string>,
  ) {
    this.#level = stages[0].props.path.length;
  }

  #forwardVar(name: string, type?: string) {
    if (
      !this.#forwardedVars.find((varDef) => varDef.variable.name.value === name)
    ) {
      this.#forwardedVars.push(
        createVarDef(name, type ?? this.stages[0].varType(name)),
      );
    }
  }

  #visitParentStage(stage: ComputeStage, children: ComputeStage[]) {
    const isTopLevel = stage.props.path.length === this.#level;
    const node = stage.props.path[stage.props.path.length - 1];
    const field = isTopLevel ? this.renames[node] ?? node : node;
    const path = stage.props.materializer?.data["path"] as string[] ?? [field];
    ensure(path.length > 0, "unexpeced empty path");

    const { argumentTypes } = stage.props;

    // For top level selections, arguments (and referenced variables) are
    // not forwarded. They are replaced by generated variables matching to the
    // computed argument values. This is to ensure that injected values are
    // properly set.
    // Is this also necessary for non top level selections??
    const argumentNodes: ReadonlyArray<ArgumentNode> = isTopLevel
      ? (argumentTypes == null ? [] : createArgs(argumentTypes))
      : (stage.props.argumentNodes ?? []);

    const targetField = createTargetField(
      path,
      this.#rootSelections,
      children.length > 0,
      argumentNodes,
    );

    if (isTopLevel) {
      for (const [name, type] of Object.entries(argumentTypes ?? {})) {
        this.#forwardVar(`_arg_${name}`, type);
      }
    } else {
      for (const argNode of argumentNodes) {
        GraphQL.visit(argNode, {
          [Kind.VARIABLE]: (node) => {
            this.#forwardVar(node.name.value);
          },
        });
      }
    }

    if (targetField.selectionSet == null) {
      return;
    }

    const targetSelections = targetField.selectionSet.selections as Array<
      SelectionNode
    >;

    if (children.length > 0) {
      const { selections, vars } = QueryRebuilder.rebuild(
        children,
        this.renames,
      );
      targetSelections.push(
        ...selections,
      );
      this.#forwardedVars.push(...vars);
    }
  }

  static rebuild(
    stages: ComputeStage[],
    renames: Record<string, string>,
  ): RebuiltGraphQuery {
    const builder = new QueryRebuilder(stages, renames);
    iterParentStages(
      stages,
      (stage, children) => builder.#visitParentStage(stage, children),
    );

    return {
      selections: builder.#rootSelections,
      vars: builder.#forwardedVars,
    };
  }
}
