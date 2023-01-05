// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import * as ast from "graphql/ast";
import { Kind } from "graphql";
import { TypeGraph } from "../typegraph.ts";
import { Context, Parents, Variables } from "../types.ts";
import { ensure } from "../utils.ts";
import { ArrayNode, ObjectNode, Type, TypeNode } from "../type_node.ts";
import { mapValues } from "std/collections/map_values.ts";
import { filterValues } from "std/collections/filter_values.ts";

export interface ComputeArg {
  (
    variables: Variables,
    parent: Parents | null,
    context: Context | null,
  ): unknown;
}

interface CollectedArg {
  compute: ComputeArg;
  policies: Record<string, string[]>;
  deps: string[];
}

export class ArgumentCollector {
  constructor(
    private tg: TypeGraph,
  ) {}

  // TODO fieldPath, path (in arg)
  collectArg(
    astNode: ast.ArgumentNode | ast.ObjectFieldNode | undefined,
    typeIdx: number,
    parentProps: Record<string, number>, // TODO rename parent context?
  ): CollectedArg {
    const typ = this.tg.type(typeIdx);
    if (typ == null) {
      throw new Error(
        `Schema for the argument type idx=${typeIdx} cannot be found`,
      );
    }

    const policies = this.getPolicies(typ);

    if ("injection" in typ) {
      ensure(
        astNode == null,
        `cannot set injected arg: '${typ.title}'`,
      );
      const [compute, deps] = this.collectInjection(typ, parentProps);
      return { compute, policies, deps };
    }

    if (astNode == null) {
      if (typ.type === Type.OPTIONAL) {
        const { default_value: defaultValue } = typ;
        const value = defaultValue ?? null;
        return {
          compute: () => value,
          policies,
          deps: [],
        };
      }

      if (typ.type === Type.OBJECT) {
        const props = typ.properties;
        return this.collectDefaults(props);
      }

      throw new Error(`mandatory arg '${typ.type}' not found`);
    }

    if (typ.type === Type.OPTIONAL) {
      return this.merge(
        { policies },
        this.collectArg(astNode, typ.item, parentProps),
      );
    }

    const { value: valueNode } = astNode;

    if (valueNode.kind === Kind.VARIABLE) {
      const { name: { value: varName } } = valueNode;
      return {
        compute: (vars) => vars[varName],
        policies,
        deps: [],
      };
    }

    if (typ.type === Type.OBJECT) {
      if (valueNode.kind !== Kind.OBJECT) {
        throw new Error(
          `type mismatch, got '${valueNode.kind}' but expected OBJECT for '${typ.title}'`,
        );
      }
      return this.merge({ policies }, this.collectObjectArg(valueNode, typ));
    }

    if (typ.type === Type.ARRAY) {
      if (valueNode.kind !== Kind.LIST) {
        throw new Error(
          `type mismatch, got '${valueNode.kind}' but expected 'LIST' for '${typ.title}'`,
        );
      }
      return this.merge(
        { policies },
        this.collectArrayArg(valueNode, typ, parentProps),
      );
    }

    if (typ.type === Type.INTEGER) {
      if (valueNode.kind !== Kind.INT) {
        throw new Error(
          `type mismatch, got '${valueNode.kind}' but expected INT for '${typ.title}'`,
        );
      }
      const value = Number(valueNode.value);
      return { compute: () => value, policies, deps: [] };
    }

    if (typ.type === Type.NUMBER) {
      if (valueNode.kind !== Kind.FLOAT && valueNode.kind !== Kind.INT) {
        throw new Error(
          `type mismatch, got '${valueNode.kind}' but expected FLOAT or INT for '${typ.title}'`,
        );
      }
      const value = Number(valueNode.value);
      return { compute: () => value, policies, deps: [] };
    }

    if (typ.type === Type.BOOLEAN) {
      if (valueNode.kind !== Kind.BOOLEAN) {
        throw new Error(
          `type mismatch, got '${valueNode.kind}' but expected 'BOOLEAN' for '${typ.title}`,
        );
      }
      const value = Boolean(astNode.value);
      return { compute: () => value, policies, deps: [] };
    }

    if (typ.type === Type.STRING) {
      if (valueNode.kind !== Kind.STRING) {
        throw new Error(
          `type mismatch, got '${valueNode.kind}' but expected 'STRING' for '${typ.title}'`,
        );
      }
      const value = String(valueNode.value);
      return { compute: () => value, policies, deps: [] };
    }

    throw new Error(`unknown variable type '${typ.type}'`);
  }

  collectArrayArg(
    valueNode: ast.ListValueNode,
    typ: ArrayNode,
    parentProps: Record<string, number>,
  ) {
    const { values: valueNodes } = valueNode;
    const itemTypeIdx = typ.items;

    const values: ComputeArg[] = [];
    const deps: string[] = [];
    const policies: Record<string, string[]> = {};

    // likely optimizabe as type should be shared
    for (const node of valueNodes) {
      const nested = this.collectArg(
        { value: node } as unknown as ast.ArgumentNode,
        itemTypeIdx,
        parentProps,
      );
      values.push(nested.compute);
      deps.push(...nested.deps);
      // FIXME policies would be shared
      Object.assign(policies, nested.policies);
    }

    return {
      compute: (...params: Parameters<ComputeArg>) =>
        values.map((c) => c(...params)),
      deps,
      policies,
    };
  }

  collectObjectArg(valueNode: ast.ObjectValueNode, typ: ObjectNode) {
    const { fields } = valueNode;
    const fieldByKeys = fields.reduce(
      (agg, field) => ({ ...agg, [field.name.value]: field }),
      {} as Record<string, ast.ObjectFieldNode>,
    );
    const props = typ.properties;

    const computes: Record<string, ComputeArg> = {};
    const deps = [];
    const policies: Record<string, string[]> = {};

    for (const [name, idx] of Object.entries(props)) {
      const nested = this.collectArg(fieldByKeys[name], idx, props);
      // TODO: apply renames
      computes[name] = nested.compute;
      deps.push(...nested.deps);
      Object.assign(policies, nested.policies);
      delete fieldByKeys[name];
    }

    for (const name of Object.keys(fieldByKeys)) {
      throw new Error(`'${name}' input as field but unknown`);
    }

    return {
      compute: (...params: Parameters<ComputeArg>) =>
        filterValues(
          mapValues(computes, (c) => c(...params)),
          (v) => v != undefined,
        ),
      policies,
      deps,
    };
  }

  private merge(a: Partial<Omit<CollectedArg, "compute">>, b: CollectedArg) {
    return {
      compute: b.compute,
      policies: { ...a.policies, ...b.policies },
      deps: [...(a.deps ?? []), ...b.deps],
    };
  }

  private collectDefaults(props: Record<string, number>): CollectedArg {
    const computes: Record<string, ComputeArg> = {};
    const deps = [];
    const policies = {};

    for (const [name, idx] of Object.entries(props)) {
      const nested = this.collectDefault(idx, props);
      computes[name] = nested.compute;
      deps.push(...nested.deps);
      Object.assign(policies, nested.policies);
    }

    return {
      compute: (...params: Parameters<ComputeArg>) =>
        mapValues(computes, (c) => c(...params)),
      deps,
      policies,
    };
  }

  private collectDefault(
    typeIdx: number,
    parentProps: Record<string, number>,
  ): CollectedArg {
    const typ = this.tg.type(typeIdx);
    if (typ == null) {
      throw new Error(`Expected a type at index '${typeIdx}'`);
    }
    const policies = this.getPolicies(typ);
    if ("injection" in typ) {
      const [compute, deps] = this.collectInjection(typ, parentProps);
      return { compute, deps, policies };
    }
    if (typ.type != Type.OPTIONAL) {
      throw new Error(`Expected value for non-optional type '${typ.title}'`);
    }
    const { default_value: defaultValue } = typ;
    return {
      compute: () => defaultValue,
      deps: [],
      policies,
    };
  }

  private collectInjection(
    typ: TypeNode,
    parentProps: Record<string, number>,
  ): [compute: ComputeArg, deps: string[]] {
    const { injection, inject } = typ;

    switch (injection) {
      case "raw": {
        const value = JSON.parse(inject as string);
        // TODO typecheck
        return [() => value, []];
      }

      case "secret": {
        const name = inject as string;
        const value = this.tg.parseSecret(typ, name);

        return [() => value, []];
      }

      case "context": {
        const name = inject as string;
        return [(_vars, _parent, context) => {
          if (context == null) {
            // computing raw arguments -- without injection
            return null;
          }

          const { [name]: value } = context;
          if (value == null && typ.type != Type.OPTIONAL) {
            throw new Error(`injection '${name}' was not found in context`);
          }
          return value;
        }, []];
      }

      case "parent":
        return this.collectParentInjection(typ, parentProps);

      default:
        throw new Error(`Unexpected injection type '${injection}'`);
    }
  }

  private collectParentInjection(
    typ: TypeNode,
    parentProps: Record<string, number>,
  ): [compute: ComputeArg, deps: string[]] {
    const ref = typ.inject as number;
    const name = Object.keys(parentProps).find((name) =>
      parentProps[name] === ref
    );
    if (name == undefined) {
      throw new Error(`injection '${typ.title} (${name})' not found in parent`);
    }

    return [
      (_vars, parent) => {
        if (parent == null) {
          // computing raw arguments - without injection
          return null;
        }

        const { [name]: value } = parent;
        if (value == null) {
          if (typ.type == Type.OPTIONAL) {
            return typ.default_value;
          }

          const suggestions = `available fields from parent are: ${
            Object.keys(parent).join(", ")
          }`;
          throw new Error(
            `non-optional injection '${typ.title} (${name}) is missing from parent: ${suggestions}`,
          );
        }

        return value;
      },
      [name],
    ];
  }

  private getPolicies(typ: TypeNode): Record<string, string[]> {
    if (typ.policies.length === 0) {
      return {};
    }
    return {
      [typ.title]: typ.policies.map((p) => this.tg.policy(p).name),
    };
  }
}
