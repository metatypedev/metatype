// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { ComputeStage } from "../engine.ts";
import { Kind, SelectionSetNode } from "graphql";
import * as ast from "graphql/ast";
import { distinct } from "std/collections/distinct.ts";
import { TypeGraph } from "../typegraph.ts";
import { Type } from "../type_node.ts";

// Reorder stages based on dependencies.
// Also adds additional stages for non-selected dependencies.
export class Scheduler {
  private readonly selections: Map<string, ast.FieldNode>;
  private stages: ComputeStage[] = [];
  private activeFields: Set<string> = new Set();
  private visitedFields: Set<string> = new Set();

  private filterDep: (nodeId: string, depId: string) => boolean;
  private getNodeName: (nodeId: string) => string;
  private getNodeId: (field: string) => string;

  constructor(
    private tg: TypeGraph,
    private parentStage: ComputeStage | null,
    private getStages: (field: ast.FieldNode) => ComputeStage[],
    selections: ast.FieldNode[],
  ) {
    this.selections = new Map();
    for (const selection of selections) {
      const name = selection.alias?.value ?? selection.name.value;
      this.selections.set(name, selection);
    }

    if (parentStage == null) {
      // filter out vertical dependencies:
      // dep is a direct ascendant of the node
      this.filterDep = (nodeId, depId) =>
        !PathUtils.startsWith(depId)(nodeId) &&
        !PathUtils.startsWith(nodeId)(depId);
      this.getNodeName = (nodeId) => {
        const end = nodeId.indexOf(".");
        return end < 0 ? nodeId : nodeId.slice(0, end);
      };
      this.getNodeId = (field) => field;
    } else {
      const rootId = parentStage.id();
      // filter out vertical dependencies: cf supra;
      // only keep descendants of root: other dependencies are scheduled in
      // some upper level.
      this.filterDep = (nodeId, depId) =>
        !PathUtils.startsWith(depId)(nodeId) &&
        !PathUtils.startsWith(nodeId)(depId) &&
        PathUtils.startsWith(rootId)(depId);

      const prefixLength = rootId.length;
      this.getNodeName = (nodeId) => {
        const start = nodeId.indexOf(".", prefixLength) + 1;
        const end = nodeId.indexOf(".", start);
        return end < 0 ? nodeId.slice(start) : nodeId.slice(start, end);
      };
      this.getNodeId = (field) => `${rootId}.${field}`;
    }
  }

  getScheduledStages(): ComputeStage[] {
    if (this.activeFields.size > 0) {
      throw new Error("unexpected: invalid state");
    }
    for (const field of this.selections.keys()) {
      this.visitField(field);
    }

    if (this.activeFields.size > 0) {
      throw new Error("unexpected: invalid state");
    }
    return this.stages;
  }

  private visitField(field: string) {
    if (this.activeFields.has(field)) {
      const path = [...this.activeFields].join(", ");
      throw new Error(`circular dependency detected: ${field}; path=${path}`);
    }

    if (this.visitedFields.has(field)) {
      return; // already scheduled
    }

    this.activeFields.add(field);

    const stages = this.getStages(this.getSelection(field));
    const deps = this.getDeps(this.getNodeId(field), stages);
    for (const dep of deps) {
      this.visitField(dep);
    }

    if (!this.selections.has(field)) {
      stages[0].props.excludeResult = true;
    }

    this.stages.push(...stages);
    this.visitedFields.add(field);
    this.activeFields.delete(field);
  }

  private getDeps(nodeId: string, stages: ComputeStage[]): string[] {
    return distinct(
      stages.flatMap((s) => s.props.dependencies)
        .filter((depId) => this.filterDep(nodeId, depId))
        .map((depId) => this.getNodeName(depId)),
    );
  }

  private getSelection(field: string): ast.FieldNode {
    const selection = this.selections.get(field);
    if (selection != null) {
      return selection;
    }

    // additional selections; not existing in the original query

    if (
      this.parentStage == null ||
      this.parentStage.props.outType.type !== Type.OBJECT
    ) {
      throw new Error("");
    }

    const typeIdx = this.parentStage.props.outType.properties[field];
    if (typeIdx == null) {
      throw new Error("Unresolved dependency");
    }

    return {
      kind: Kind.FIELD,
      name: {
        kind: Kind.NAME,
        value: field,
      },
      selectionSet: this.getSelectionSet(typeIdx),
      // arguments: undefined,
      // TODO what if the selection requires arguments???
    };
  }

  private getSelectionSet(
    typeIdx: number,
  ): SelectionSetNode | undefined {
    let typeNode = this.tg.type(typeIdx);

    while (true) {
      if (typeNode.type === Type.OPTIONAL) {
        typeNode = this.tg.type(typeNode.item);
      } else if (typeNode.type === Type.ARRAY) {
        typeNode = this.tg.type(typeNode.items);
      } else if (typeNode.type === Type.FUNCTION) {
        typeNode = this.tg.type(typeNode.output);
      } else {
        break;
      }
    }

    switch (typeNode.type) {
      // scalar types
      case Type.BOOLEAN:
      case Type.INTEGER:
      case Type.NUMBER:
      case Type.STRING:
      case Type.FILE:
        return undefined;

      case Type.OBJECT:
        return {
          kind: Kind.SELECTION_SET,
          selections: Object.entries(typeNode.properties).map((
            [name, idx],
          ) => ({
            kind: Kind.FIELD,
            name: {
              kind: Kind.NAME,
              value: name,
            },
            selectionSet: this.getSelectionSet(idx),
          })),
        };

      // TODO unions

      default:
        throw new Error(`Not implemented: type ${typeNode.type}`);
    }
  }
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
