// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { ComputeStage } from "../engine.ts";
import { FieldNode, Kind, SelectionSetNode } from "graphql";
import * as ast from "graphql/ast";
import { distinct } from "std/collections/distinct.ts";
import { PossibleSelectionFields, TypeGraph } from "../typegraph.ts";
import { ObjectNode } from "../type_node.ts";

// Reorder stages for the selection on an object type, based on dependencies.
// Also adds additional stages for non-selected dependencies.
export class Scheduler {
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
    return !PathUtils.startsWith(depId)(nodeId) &&
      !PathUtils.startsWith(nodeId)(depId) &&
      (this.parentId == null || PathUtils.startsWith(this.parentId)(depId));
  }

  private getNodeName(nodeId: string) {
    const prefixLength = this.parentId?.length;
    const start = prefixLength == null
      ? 0
      : nodeId.indexOf(".", prefixLength) + 1;
    const end = nodeId.indexOf(".", start);
    return end < 0 ? nodeId.slice(start) : nodeId.slice(start, end);
  }

  private getNodeId(fieldName: string) {
    return this.parentId == null ? fieldName : `${this.parentId}.${fieldName}`;
  }

  getScheduledStages(): ComputeStage[] {
    if (this.activeFields.size > 0) {
      throw new Error("unexpected: invalid state");
    }

    for (const fieldName of this.fields.keys()) {
      this.visitField(fieldName);
    }

    if (this.activeFields.size > 0) {
      throw new Error("unexpected: nvalid state");
    }

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
    const deps = this.getDeps(this.getNodeId(field), stages);
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
        .map((depId) => this.getNodeName(depId)),
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
      throw new Error("unresolved dependancy");
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

class PathUtils {
  static startsWith = (prefix: string) => (path: string) => {
    if (!path.startsWith(prefix)) return false;
    const prefixLength = prefix.length;
    if (path.length === prefixLength) return true; // prefix === path
    const c = path.charAt(prefixLength);
    return c === "." || c === "$";
  };
}
