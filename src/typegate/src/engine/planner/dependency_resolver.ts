// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { ComputeStage } from "../query_engine.ts";
import { type FieldNode, Kind, type SelectionSetNode } from "graphql";
import type * as ast from "graphql/ast";
import { distinct } from "@std/collections/distinct";
import type {
  PossibleSelectionFields,
  TypeGraph,
} from "../../typegraph/mod.ts";
import type { ObjectNode } from "../../typegraph/type_node.ts";
import { ensure } from "../../utils.ts";
import { getChildId, getChildNode, startsWith } from "../stage_id.ts";

// Reorder stages for the selection on an object type, based on dependencies.
// Also adds additional stages for non-selected dependencies.
export class DependencyResolver {
  private readonly fields: Map<string, ast.FieldNode>;
  private stages: ComputeStage[] = [];
  private activeFields: Set<string> = new Set();
  private visitedFields: Set<string> = new Set();

  constructor(
    private tg: TypeGraph,
    private parentId: string | null,
    private parentType: ObjectNode | null,
    private stageFactory: (field: ast.FieldNode) => ComputeStage[],
    selection: ast.FieldNode[],
  ) {
    this.fields = new Map();

    for (const field of selection) {
      const name = field.alias?.value ?? field.name.value;
      this.fields.set(name, field);
    }
  }

  private filterDep(nodeId: string, depId: string) {
    // 1. filter out vertical dependencies: dep is a direct ascendant of node
    // 2. only keep descendants of parent: since they will be scheduled as
    // a child stage
    return !startsWith(nodeId, depId) && !startsWith(depId, nodeId) &&
      (this.parentId == null || startsWith(depId, this.parentId));
  }

  getScheduledStages(): ComputeStage[] {
    ensure(this.activeFields.size === 0, "unexpected: invalid state");

    for (const fieldName of this.fields.keys()) {
      this.visitField(fieldName);
    }

    ensure(this.activeFields.size === 0, "unexpected: invalid state");

    return this.stages;
  }

  private visitField(field: string) {
    if (this.activeFields.has(field)) {
      const path = [...this.activeFields].join(", ");
      throw new Error(
        `circular dependency detected: field=${field}; path=${path}`,
      );
    }

    if (this.visitedFields.has(field)) {
      return; // already scheduled
    }

    this.activeFields.add(field);

    const stages = this.stageFactory(this.getField(field));
    const deps = this.getDeps(getChildId(this.parentId, field), stages);
    for (const dep of deps) {
      this.visitField(dep);
    }

    if (!this.fields.has(field)) {
      stages[0].props.excludeResult = true;
    }

    this.stages.push(...stages);
    this.visitedFields.add(field);
    this.activeFields.delete(field);
  }

  // get the dependencies on all the descendants
  private getDeps(nodeId: string, stages: ComputeStage[]): string[] {
    return distinct(
      stages.flatMap((s) => s.props.dependencies)
        .filter((depId) => this.filterDep(nodeId, depId))
        .map((depId) => getChildNode(this.parentId, depId)!).filter((d) =>
          d !== null
        ),
    );
  }

  private getField(fieldName: string): ast.FieldNode {
    const field = this.fields.get(fieldName);
    if (field != null) {
      return field;
    }

    // additional fields, not existing on the original query
    const typeIdx = this.parentType?.properties[fieldName];
    if (typeIdx == null) {
      throw new Error(
        `unresolved dependancy: '${fieldName}' at '${this.parentId}'`,
      );
    }

    return createFieldNode(
      fieldName,
      createSelectionSet(this.tg.getPossibleSelectionFields(typeIdx)),
    );
  }
}

function createSelectionSet(
  possibleSelections: PossibleSelectionFields,
): SelectionSetNode | undefined {
  if (possibleSelections == null) {
    return undefined;
  }

  if (possibleSelections instanceof Map) {
    return {
      kind: Kind.SELECTION_SET,
      selections: [...possibleSelections.entries()].map(
        ([fieldName, childSelections]) => {
          return {
            kind: Kind.FIELD,
            name: {
              kind: Kind.NAME,
              value: fieldName,
            },
            selectionSet: createSelectionSet(childSelections),
          };
        },
      ),
    };
  }

  return {
    kind: Kind.SELECTION_SET,
    selections: possibleSelections.map(([typeName, fields]) => {
      return {
        kind: Kind.INLINE_FRAGMENT,
        typeCondition: {
          kind: Kind.NAMED_TYPE,
          name: {
            kind: Kind.NAME,
            value: typeName,
          },
        },
        selectionSet: createSelectionSet(fields)!,
      };
    }),
  };
}

function createFieldNode(
  fieldName: string,
  selectionSet?: SelectionSetNode,
): FieldNode {
  return {
    kind: Kind.FIELD,
    name: {
      kind: Kind.NAME,
      value: fieldName,
    },
    selectionSet,
  };
}
