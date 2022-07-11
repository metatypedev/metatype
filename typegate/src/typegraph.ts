import type * as ast from "https://cdn.skypack.dev/graphql@16.2.0/language/ast?dts";
import {
  GraphQLArgs,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  Kind,
  parse,
  TypeKind,
} from "https://cdn.skypack.dev/graphql@16.2.0?dts";
import { ComputeStage, PolicyStages, PolicyStagesFactory } from "./engine.ts";
import * as graphql from "./graphql.ts";
import { FragmentDefs } from "./graphql.ts";
import { DenoRuntime } from "./runtimes/DenoRuntime.ts";
import { GoogleapisRuntime } from "./runtimes/GoogleapisRuntime.ts";
import { GraphQLRuntime } from "./runtimes/GraphQLRuntime.ts";
import { HTTPRuntime } from "./runtimes/HTTPRuntime.ts";
import { PrismaRuntime } from "./runtimes/PrismaRuntime.ts";
import {
  Batcher,
  Resolver,
  Runtime,
  RuntimeConfig,
  RuntimeInit,
  RuntimesConfig,
} from "./runtimes/Runtime.ts";
import { TypeGraphRuntime } from "./runtimes/TypeGraphRuntime.ts";
import { WorkerRuntime } from "./runtimes/WorkerRuntime.ts";
import { b, ensure, mapo } from "./utils.ts";

interface TypePolicy {
  name: string;
  materializer: number;
}

export interface TypeNode {
  name: string;
  typedef: string;
  edges: Array<number>;
  policies: Array<number>;
  runtime: number;
  data: Record<string, unknown>;
}

export interface TypeMaterializer {
  name: string;
  runtime: number;
  data: Record<string, unknown>;
}

export interface TypeRuntime {
  name: string;
  data: Record<string, unknown>;
}

export interface TypeGraphDS {
  types: Array<TypeNode>;
  materializers: Array<TypeMaterializer>;
  runtimes: Array<TypeRuntime>;
  policies: Array<TypePolicy>;
}

export type RuntimeResolver = Record<string, Runtime>;

const stringTypeNode: TypeNode = {
  // FIXME: remove dummy
  name: "string",
  typedef: "string",
  edges: [],
  policies: [],
  runtime: -1,
  data: {},
};

const runtimeInit: RuntimeInit = {
  graphql: GraphQLRuntime.init,
  worker: WorkerRuntime.init,
  prisma: PrismaRuntime.init,
  http: HTTPRuntime.init,
  deno: DenoRuntime.init,
  googleapis: GoogleapisRuntime.init,
  //typegraph: TypeGraphRuntime.init,
};

export class TypeGraph {
  static readonly emptyArgs: ast.ArgumentNode[] = [];
  static emptyFields: ast.SelectionSetNode = {
    kind: Kind.SELECTION_SET,
    selections: [],
  };

  tg: TypeGraphDS;
  runtimeReferences: RuntimeResolver;
  root: TypeNode;
  introspection: TypeGraph | null;

  private constructor(
    typegraph: TypeGraphDS,
    runtimeReferences: RuntimeResolver,
    introspection: TypeGraph | null,
  ) {
    this.tg = typegraph;
    this.runtimeReferences = runtimeReferences;
    this.root = this.type(0);
    this.introspection = introspection;
  }

  static async init(
    typegraph: TypeGraphDS,
    staticReference: RuntimeResolver,
    introspection: TypeGraph | null,
    runtimeConfig: RuntimesConfig,
  ): Promise<TypeGraph> {
    const runtimeReferences = { ...staticReference };

    for await (const [idx, runtime] of typegraph.runtimes.entries()) {
      if (!(runtime.name in runtimeReferences)) {
        ensure(
          runtime.name in runtimeInit,
          `cannot find runtime "${runtime.name}" in ${
            Object.keys(
              runtimeReferences,
            ).join(", ")
          }`,
        );

        const mats = typegraph.materializers.filter(
          (mat) => mat.runtime === idx,
        );

        console.log(`init ${runtime.name}`);
        runtimeReferences[runtime.name] = await runtimeInit[runtime.name](
          typegraph,
          mats,
          runtime.data,
          runtimeConfig[runtime.name] ?? {},
        );
      }
    }

    return new TypeGraph(typegraph, runtimeReferences, introspection);
  }

  async deinit(): Promise<void> {
    for await (
      const [name, runtime] of Object.entries(
        this.runtimeReferences,
      )
    ) {
      console.log(`deinit ${name}`);
      await runtime.deinit();
    }
  }

  type(idx: number): TypeNode {
    ensure(typeof idx === "number", `cannot find type with "${idx}" index`);
    return this.tg.types[idx];
  }

  materializer(idx: number): TypeMaterializer {
    return this.tg.types[idx];
  }

  runtime(idx: number): TypeRuntime {
    return this.tg.runtimes[idx];
  }

  policy(idx: number): TypePolicy {
    return this.tg.policies[idx];
  }

  // value, policies, dependencies
  collectArg(
    fieldArg: ast.ArgumentNode | ast.ObjectFieldNode | undefined,
    argIdx: number,
    parentContext: Record<string, number>,
    noDefault = false,
  ): [(deps: any) => unknown, Record<string, string[]>, string[]] | null {
    const arg = this.tg.types[argIdx];

    if (!arg) {
      throw Error(`${argIdx} not found in type`);
    }

    let policies = arg.policies.length > 0
      ? {
        [arg.name]: arg.policies.map((p) => this.policy(p).name),
      }
      : {};

    const {
      default_value: defaultValue,
      apply_value: applyValue,
      apply_sealed: applySealed,
    } = arg.data;

    if (applyValue && applySealed) {
      ensure(!fieldArg, "cannot set applied arg");
      return [() => applyValue, policies, []];
    }

    if (!fieldArg) {
      if (arg.typedef === "optional") {
        return !noDefault && defaultValue
          ? [() => defaultValue, policies, []]
          : null;
      }

      if (arg.typedef === "injection") {
        const ref = arg.data.of as number;
        const name = Object.keys(parentContext).find(
          (name) => parentContext[name] === ref,
        );

        if (!name) {
          throw Error(
            `cannot find injection ${
              JSON.stringify(
                arg,
              )
            } in context ${parentContext}`,
          );
        }

        return [({ [name]: inject }) => inject, policies, [name]];
      }

      if (arg.typedef === "struct") {
        const argSchema = arg.data.binds as Record<string, number>;
        const values: Record<string, any> = {};
        const deps = [];

        for (const [fieldName, fieldIdx] of Object.entries(argSchema)) {
          const nested = this.collectArg(
            undefined,
            fieldIdx,
            parentContext,
            true,
          );
          if (!nested) {
            continue;
          }
          const [value, nestedPolicies, nestedDeps] = nested;
          deps.push(...nestedDeps);
          values[fieldName] = value;
          policies = { ...policies, ...nestedPolicies };
        }

        if (Object.values(values).length < 1) {
          throw Error(`mandatory arg ${JSON.stringify(arg)} not found`);
        }

        return [(deps: any) => mapo(values, (e) => e(deps)), policies, deps];
      }

      throw Error(`mandatory arg ${JSON.stringify(arg)} not found`);
    }

    if (arg.typedef === "optional") {
      return this.collectArg(fieldArg, arg.edges[0], parentContext);
    }

    const { value: argValue } = fieldArg;
    const { kind } = argValue;

    if (kind === Kind.VARIABLE) {
      const { kind: nestedKind, value: nestedArg } = argValue.name;
      return [
        ({ [nestedArg]: value }) => {
          // inner check of type (run at runtime)
          return value;
        },
        policies,
        [],
      ];
    }

    if (arg.typedef === "struct") {
      ensure(
        kind === Kind.OBJECT,
        `type mismatch, got ${kind} but expected OBJECT for ${arg.name}`,
      );
      const { fields } = argValue as ast.ObjectValueNode;
      const argSchema = arg.data.binds as Record<string, number>;

      const fieldArgsIdx: Record<string, ast.ObjectFieldNode> = fields.reduce(
        (agg, fieldArg) => ({ ...agg, [fieldArg.name.value]: fieldArg }),
        {},
      );

      const values: Record<string, any> = {};
      const deps = [];

      for (const [fieldName, fieldIdx] of Object.entries(argSchema)) {
        const nested = this.collectArg(
          fieldArgsIdx[fieldName],
          fieldIdx,
          parentContext,
        );
        if (!nested) {
          continue;
        }
        const [value, nestedPolicies, nestedDeps] = nested;
        deps.push(...nestedDeps);
        const renames = (arg.data.renames as Record<string, string>) ?? {};
        values[renames[fieldName] ?? fieldName] = value;
        delete fieldArgsIdx[fieldName];
        policies = { ...policies, ...nestedPolicies };
      }

      for (const name of Object.keys(fieldArgsIdx)) {
        throw Error(`${name} input as field but unknown`);
      }

      return [(deps: any) => mapo(values, (e) => e(deps)), policies, deps];
    }

    if (arg.typedef === "list") {
      ensure(
        kind === Kind.LIST,
        `type mismatch, got ${kind} but expected LIST for ${arg.name}`,
      );
      const { values: valueOfs } = argValue as ast.ListValueNode;
      const valueIdx = arg.data.of as number;

      const values: any[] = [];
      const deps = [];

      // likely optimizable as type should be shared
      for (const valueOf of valueOfs) {
        const nested = this.collectArg(
          { value: valueOf } as unknown as ast.ArgumentNode,
          valueIdx,
          parentContext,
        );
        if (!nested) {
          throw Error("unknown subtype");
        }
        const [value, nestedPolicies, nestedDeps] = nested;
        deps.push(...nestedDeps);
        values.push(value);
        policies = { ...policies, ...nestedPolicies };
      }

      return [(deps) => values.map((e) => e(deps)), policies, deps];
    }

    if (arg.typedef === "integer") {
      ensure(
        kind === Kind.INT,
        `type mismatch, got ${kind} but expected INT for ${arg.name}`,
      );
      const { value } = argValue as ast.IntValueNode;
      const parsed = Number(value);
      return [() => parsed, policies, []];
    }

    if (arg.typedef === "boolean") {
      ensure(
        kind === Kind.BOOLEAN,
        `type mismatch, got ${kind} but expected BOOLEAN for ${arg.name}`,
      );
      const { value } = argValue as ast.IntValueNode;
      const parsed = Boolean(value);
      return [() => parsed, policies, []];
    }

    if (
      arg.typedef === "string" ||
      arg.typedef === "uuid" ||
      arg.typedef === "json"
    ) {
      ensure(
        kind === Kind.STRING,
        `type mismatch, got ${kind} but expected STRING for ${arg.name}`,
      );
      const { value } = argValue as ast.StringValueNode;
      const parsed = String(value);
      return [() => parsed, policies, []];
    }

    throw Error(
      `unknown variable value ${JSON.stringify(arg)} ${JSON.stringify(fieldArg)}
      (${kind}) for ${arg.name}`,
    );
  }

  traverse(
    fragments: FragmentDefs,
    parentName: string,
    parentArgs: readonly ast.ArgumentNode[],
    parentSelectionSet: ast.SelectionSetNode,
    verbose: boolean,
    queryPath: string[] = [],
    parentIdx = 0,
    parentStage: ComputeStage | undefined = undefined,
    serial = false,
  ): ComputeStage[] {
    const parentType = this.type(parentIdx);
    const stages: ComputeStage[] = [];

    const parentSelection = graphql.resolveSelection(
      parentSelectionSet,
      fragments,
    );
    const fieldSchema = (parentType.data.binds ?? {}) as Record<string, number>;
    verbose &&
      console.log(
        this.root.name,
        parentName,
        parentArgs.map((n) => n.name?.value),
        parentSelection.map((n) => n.name?.value),
        parentType.typedef,
        Object.entries(fieldSchema).reduce(
          (agg, [k, v]) => ({ ...agg, [k]: this.type(v).typedef }),
          {},
        ),
      );

    if (parentType.typedef === "struct" && parentSelection.length < 1) {
      throw Error(`struct "${parentName}" must a field selection`);
    }

    for (const field of parentSelection) {
      const {
        name: { value: fieldName },
        alias,
        arguments: fieldArgs,
        selectionSet: fieldFields,
      } = field;
      const { value: aliasName } = alias ?? {};
      let policies: Record<string, string[]> = {};

      // introspection cases
      if (
        queryPath.length < 1 &&
        this.introspection &&
        (fieldName === "__schema" || fieldName === "__type")
      ) {
        stages.push(
          ...this.introspection.traverse(
            fragments,
            parentName,
            parentArgs,
            {
              kind: Kind.SELECTION_SET,
              selections: [field],
            },
            verbose,
          ),
        );
        continue;
      }

      // typename case
      if (fieldName == "__typename") {
        if (fieldArgs && fieldArgs.length > 0) {
          throw Error(
            `__typename cannot have args ${JSON.stringify(fieldArgs)}`,
          );
        }

        stages.push(
          new ComputeStage({
            dependencies: [],
            parent: parentStage,
            args: {},
            policies,
            outType: stringTypeNode,
            runtime: this.runtimeReferences["deno"],
            batcher: this.nextBatcher(stringTypeNode),
            node: fieldName,
            path: [...queryPath, aliasName ?? fieldName],
          }),
        );

        continue;
      }

      const fieldIdx = fieldSchema[fieldName];
      if (!fieldIdx) {
        throw Error(
          `${fieldName} not found in ${JSON.stringify(this.type(parentIdx))}`,
        );
      }
      const fieldType = this.type(fieldIdx);
      const checksField = fieldType.policies.map((p) => this.policy(p).name);
      if (checksField.length > 0) {
        policies[fieldType.name] = checksField;
      }

      // value case
      if (fieldType.typedef !== "func" && fieldType.typedef !== "gen") {
        if (fieldArgs && fieldArgs.length > 0) {
          throw Error(
            `unexpected args=${JSON.stringify(fieldArgs)} for ${fieldType}`,
          );
        }

        const runtime = this.tg.runtimes[fieldType.runtime];

        const stage = new ComputeStage({
          dependencies: parentStage ? [parentStage.id()] : [],
          parent: parentStage,
          args: {},
          policies,
          outType: fieldType,
          runtime: this.runtimeReferences[runtime.name],
          batcher: this.nextBatcher(fieldType),
          node: fieldName,
          path: [...queryPath, aliasName ?? fieldName],
        });
        stages.push(stage);

        if (fieldType.typedef === "struct") {
          stages.push(
            ...this.traverse(
              fragments,
              fieldName,
              fieldArgs ?? TypeGraph.emptyArgs,
              fieldFields ?? TypeGraph.emptyFields,
              verbose,
              [...queryPath, aliasName ?? fieldName],
              fieldIdx,
              stage,
            ),
          );
        } else if (
          fieldType.typedef === "optional" &&
          this.type(fieldType.edges[0]).typedef === "list"
        ) {
          const subTypeIdx = fieldType.edges[0];
          const subType = this.type(subTypeIdx);
          const subSubTypeIdx = subType.edges[0];
          const subSubType = this.type(subSubTypeIdx);

          if (subSubType.typedef === "struct") {
            stages.push(
              ...this.traverse(
                fragments,
                fieldName,
                fieldArgs ?? TypeGraph.emptyArgs,
                fieldFields ?? TypeGraph.emptyFields,
                verbose,
                [...queryPath, aliasName ?? fieldName],
                subSubTypeIdx,
                stage,
              ),
            );
          }
        } else if (
          fieldType.typedef === "list" ||
          fieldType.typedef === "optional"
        ) {
          const subTypeIdx = fieldType.edges[0];
          const subType = this.type(subTypeIdx);

          if (subType.typedef === "struct") {
            stages.push(
              ...this.traverse(
                fragments,
                fieldName,
                fieldArgs ?? TypeGraph.emptyArgs,
                fieldFields ?? TypeGraph.emptyFields,
                verbose,
                [...queryPath, aliasName ?? fieldName],
                subTypeIdx,
                stage,
              ),
            );
          }
        } else {
          //verbose && console.log("no stage for", fieldType.typedef);
        }
        continue;
      }

      // func case

      const dependencies = [];
      if (parentStage) {
        dependencies.push(parentStage.id());
      }

      const [inputIdx, outputIdx] = fieldType.edges;
      const outputType = this.type(outputIdx);
      const checks = outputType.policies.map((p) => this.policy(p).name);
      if (checks.length > 0) {
        policies[outputType.name] = checks;
      }
      const args: Record<string, (deps: any) => unknown> = {};

      const argSchema = this.tg.types[inputIdx].data.binds as Record<
        string,
        number
      >;
      const fieldArgsIdx: Record<string, ast.ArgumentNode> = (
        fieldArgs ?? []
      ).reduce(
        (agg, fieldArg) => ({ ...agg, [fieldArg.name.value]: fieldArg }),
        {},
      );

      const nestedDepsUnion = [];
      for (const [argName, argIdx] of Object.entries(argSchema ?? {})) {
        const nested = this.collectArg(
          fieldArgsIdx[argName],
          argIdx,
          fieldSchema,
        );
        if (!nested) {
          continue;
        }
        const [value, inputPolicies, nestedDeps] = nested;
        nestedDepsUnion.push(...nestedDeps);
        args[argName] = value;
        policies = { ...policies, ...inputPolicies };
        // else variable
      }

      // check that no unnecessary arg is given
      for (const fieldArg of fieldArgs ?? []) {
        const name = fieldArg.name.value;
        if (!(name in args)) {
          throw Error(`${name} input as field but unknown`);
        }
      }

      dependencies.push(
        ...Array.from(new Set(nestedDepsUnion)).map((dep) =>
          [...queryPath, dep].join(".")
        ),
      );

      const mat = this.tg.materializers[fieldType.data.materializer as number];
      const runtime = this.tg.runtimes[mat.runtime];

      if (!serial && mat.data.serial) {
        throw Error(
          `${fieldType.name} via ${mat.name} can only be executed in mutation`,
        );
      }

      const stage = new ComputeStage({
        dependencies,
        parent: parentStage,
        args,
        policies,
        outType: outputType,
        runtime: this.runtimeReferences[runtime.name],
        materializer: mat,
        batcher: this.nextBatcher(outputType),
        node: fieldName,
        path: [...queryPath, aliasName ?? fieldName],
      });
      stages.push(stage);

      if (outputType.typedef === "struct") {
        stages.push(
          ...this.traverse(
            fragments,
            fieldName,
            fieldArgs ?? TypeGraph.emptyArgs,
            fieldFields ?? TypeGraph.emptyFields,
            verbose,
            [...queryPath, fieldName],
            outputIdx,
            stage,
          ),
        );
      } else if (
        outputType.typedef === "optional" &&
        this.type(outputType.edges[0]).typedef === "list"
      ) {
        const subTypeIdx = outputType.edges[0];
        const subType = this.type(subTypeIdx);
        const subSubTypeIdx = subType.edges[0];
        const subSubType = this.type(subSubTypeIdx);

        if (subSubType.typedef === "struct") {
          stages.push(
            ...this.traverse(
              fragments,
              fieldName,
              fieldArgs ?? TypeGraph.emptyArgs,
              fieldFields ?? TypeGraph.emptyFields,
              verbose,
              [...queryPath, aliasName ?? fieldName],
              subSubTypeIdx,
              stage,
            ),
          );
        }
      } else if (
        outputType.typedef === "list" ||
        outputType.typedef === "optional"
      ) {
        const subTypeIdx = outputType.edges[0];
        const subType = this.type(subTypeIdx);
        if (subType.typedef === "struct") {
          stages.push(
            ...this.traverse(
              fragments,
              fieldName,
              fieldArgs ?? TypeGraph.emptyArgs,
              fieldFields ?? TypeGraph.emptyFields,
              verbose,
              [...queryPath, aliasName ?? fieldName],
              subTypeIdx,
              stage,
            ),
          );
        }
      }
    }

    return stages;
  }

  preparePolicies(stages: ComputeStage[]): PolicyStagesFactory {
    const policies = Array.from(
      new Set(
        stages.flatMap((stage) => Object.values(stage.props.policies).flat()),
      ),
    ).map((policyName) => {
      // bug-prone, lookup first for policies in introspection, then in current typegraph
      if (this.introspection) {
        const introPolicy = this.introspection.tg.policies.find(
          (p) => p.name === policyName,
        );

        if (introPolicy) {
          const mat = this.introspection.tg.materializers[
            introPolicy.materializer as number
          ];
          const runtime = this.introspection.tg.runtimes[mat.runtime];
          const rt = this.introspection.runtimeReferences[
            runtime.name
          ] as WorkerRuntime; // temp
          return [introPolicy.name, rt.delegate(mat.name)] as [
            string,
            Resolver,
          ];
        }
      }

      const policy = this.tg.policies.find((p) => p.name === policyName);
      if (!policy) {
        throw Error(`cannot find policy ${policyName}`);
      }

      const mat = this.tg.materializers[policy.materializer as number];
      const runtime = this.tg.runtimes[mat.runtime];
      const rt = this.runtimeReferences[runtime.name] as WorkerRuntime; // temp
      return [policy.name, rt.delegate(mat.name)] as [string, Resolver];
    });

    return (claim: Record<string, any>) => {
      const ret: PolicyStages = {};
      for (const [policyName, resolver] of policies) {
        ret[policyName] = async () =>
          await lazyResolver<boolean | null>(resolver)(claim);
      }
      return ret;
    };
  }

  nextBatcher = (type: TypeNode): Batcher => {
    // convenience check to be removed
    const ensureArray = (x: []) => {
      ensure(Array.isArray(x), `${JSON.stringify(x)} not an array`);
      return x;
    };

    const edgesRes = type.edges.map((n) => this.type(n));

    if (type.typedef === "list") {
      if (edgesRes![0].typedef === "optional") {
        throw Error("D");
        //return (x: any) => x.flat().filter((c: any) => !!c);
      }
      return (x: any) => ensureArray(x).flat();
    }
    if (type.typedef === "optional") {
      if (edgesRes![0].typedef === "list") {
        return (x: any) =>
          ensureArray(x)
            .filter((c: any) => !!c)
            .flat();
      }
      return (x: any) => ensureArray(x).filter((c: any) => !!c);
    }
    ensure(
      type.typedef === "struct" ||
        type.typedef === "enum" ||
        type.typedef === "uri" ||
        type.typedef === "float" ||
        type.typedef === "integer" ||
        type.typedef === "boolean" ||
        type.typedef === "gen" ||
        type.typedef === "uuid" ||
        type.typedef === "string",
      `struct expected but got ${type.typedef}`,
    );
    return (x: any) => ensureArray(x);
  };
}

const lazyResolver = <T>(
  fn: (args: any) => Promise<T>,
): (args: any) => Promise<T> => {
  let memo: Promise<T> | undefined = undefined;
  // deno-lint-ignore require-await
  return async (args: any) => {
    if (!memo) {
      memo = fn(args);
    }
    return memo;
  };
};
