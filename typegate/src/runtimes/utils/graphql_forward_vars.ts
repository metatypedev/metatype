// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { ensure, JSONValue, unzip } from "../../utils.ts";
import type { FromVars } from "../graphql.ts";
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

export function stringifyQL(
  obj: JSONValue | FromVars<JSONValue>,
): [q: string, vars: string[]] {
  if (typeof obj === "function") {
    const varName = obj(null as unknown as Record<string, unknown>);
    // assert typeof varName === "string"
    return [`$${varName}`, [varName as string]];
  }

  if (Array.isArray(obj)) {
    const [qs, vars] = unzip(obj.map(stringifyQL));
    return [`[${qs.join(", ")}]`, vars.flat(1)];
  }

  if (typeof obj === "object" && obj != null) {
    const [qs, vars] = unzip(Object.entries(obj)!.map(([k, v]) => {
      const [q, vars] = stringifyQL(v);
      return [[k, q] as const, vars];
    }));
    return [
      `{${
        qs.map(([k, v]) => `${k}: ${v}`)
          .join(", ")
      }}`,
      vars.flat(1),
    ];
  }

  return [JSON.stringify(obj), []];
}

// const createArgNode = (name: string, value: ValueNode): ArgumentNode => {
//   return {
//     kind: Kind.ARGUMENT,
//     name: {
//       kind: Kind.NAME,
//       value: name,
//     },
//     value,
//   };
// };

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
    // if (Boolean(selectionSet) !== Boolean(found.selectionSet)) {
    //   throw new Error("unexpected result")
    // }
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

export function rebuildGraphQuery(
  { stages, renames }: RebuildQueryParam,
): RebuiltGraphQuery {
  // let query = "";
  const rootSelections: Array<FieldNode> = [];
  const forwaredVars: Array<VariableDefinitionNode> = [];
  // const forwardedVars: Record<string, string> = {};
  const forwardVar = (name: string) => {
    // if (!Object.hasOwnProperty.call(forwardedVars, name)) {
    //   forwardedVars[name] = stages[0].varType(name);
    // }
    if (!forwaredVars.find((varDef) => varDef.variable.name.value === name)) {
      forwaredVars.push(createVarDef(name, stages[0].varType(name)));
    }
  };
  console.log("stages", stages.map((p) => p.props.path));
  // if (stages.length <= 3) throw new Error("End of life");
  iterParentStages(stages, (stage, children) => {
    const field = stage.props.path[stage.props.path.length - 1];
    // console.log("stages", stages.map((s) => s.props.path));
    // console.log("stage", stage.props);
    // console.log("children", children.map((c) => c.props.path));
    const path = stage.props.materializer?.data["path"] as string[] ?? [field];
    ensure(path.length > 0, "unexpeced empty path");
    // console.log("input type", stage.props.inpType, stage.props.argumentNodes);
    // const args = Object.entries(stage.props.args).map(
    //   ([argName, argValue]) => {
    //     const val = argValue({}, null, {}); // as FromVars<_>
    //     if (typeof val === "function") {
    //       const varName = val(null) as string;
    //       forwardVar(varName);
    //       return createArgNode(argName, {
    //         kind: Kind.VARIABLE,
    //         name: {
    //           kind: Kind.NAME,
    //           value: varName,
    //         },
    //       });
    //     }
    //     console.log("args", stage.props.args);
    //     const [q, vs] = stringifyQL(val as JSONValue);
    //     if (vs.length > 0) {
    //       console.log({ val, q, vs });
    //       throw new Error("not implemented");
    //     }
    //     return createArgNode(argName, GraphQL.parseValue(q));
    //   },
    // );
    const targetField = createTargetField(
      path,
      rootSelections,
      children.length > 0,
      stage.props.argumentNodes ?? [],
    );

    if (stage.props.argumentNodes) {
      for (const argNode of stage.props.argumentNodes) {
        GraphQL.visit(argNode, {
          [Kind.VARIABLE]: (node) => {
            forwardVar(node.name.value);
          },
        });
      }
    }

    // children
    if (children.length > 0) {
      const { selections, vars } = rebuildGraphQuery({
        stages: children,
        renames,
      });
      (targetField.selectionSet!.selections as Array<SelectionNode>).push(
        ...selections,
      );
      forwaredVars.push(...vars);
    }
  });
  return { selections: rootSelections, vars: forwaredVars };
}
