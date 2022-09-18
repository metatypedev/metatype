import type * as ast from "graphql_ast";
import { Kind } from "graphql";
import {
  ComputeArg,
  ComputeStage,
  PolicyStages,
  PolicyStagesFactory,
} from "./engine.ts";
import * as graphql from "./graphql.ts";
import { FragmentDefs } from "./graphql.ts";
import { DenoRuntime } from "./runtimes/deno.ts";
import { GoogleapisRuntime } from "./runtimes/googleapis.ts";
import { GraphQLRuntime } from "./runtimes/graphql.ts";
import { HTTPRuntime } from "./runtimes/http.ts";
import { PrismaRuntime } from "./runtimes/prisma.ts";
import { RandomRuntime } from "./runtimes/random.ts";
import {
  Batcher,
  Resolver,
  Runtime,
  RuntimeInit,
  RuntimesConfig,
} from "./runtimes/Runtime.ts";
import { Code } from "./runtimes/utils/codes.ts";
import { ensure, envOrFail, mapo } from "./utils.ts";
import { compileCodes } from "./utils/swc.ts";
import { v4 as uuid } from "std/uuid/mod.ts";

import { Auth, AuthDS, nextAuthorizationHeader } from "./auth.ts";

import { ListNode, StructNode, TypeNode } from "./type_node.ts";

interface TypePolicy {
  name: string;
  materializer: number;
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

export interface TypeMeta {
  secrets: Array<string>;
  cors: {
    allow_origin: Array<string>;
    allow_methods: Array<string>;
    allow_headers: Array<string>;
    expose_headers: Array<string>;
    allow_credentials: boolean;
    max_age: number | null;
  };
  auths: Array<AuthDS>;
}

export interface TypeGraphDS {
  types: Array<TypeNode>;
  materializers: Array<TypeMaterializer>;
  runtimes: Array<TypeRuntime>;
  policies: Array<TypePolicy>;
  codes: Array<Code>;
  meta: TypeMeta;
}

export type RuntimeResolver = Record<string, Runtime>;

const dummyStringTypeNode: TypeNode = {
  // FIXME: remove dummy
  name: "string",
  typedef: "string",
  policies: [],
  runtime: -1,
  data: {},
};

const runtimeInit: RuntimeInit = {
  graphql: GraphQLRuntime.init,
  prisma: PrismaRuntime.init,
  http: HTTPRuntime.init,
  deno: DenoRuntime.init,
  googleapis: GoogleapisRuntime.init,
  random: RandomRuntime.init,
  //typegraph: TypeGraphRuntime.init,
};

export class TypeGraph {
  static readonly emptyArgs: ast.ArgumentNode[] = [];
  static emptyFields: ast.SelectionSetNode = {
    kind: Kind.SELECTION_SET,
    selections: [],
  };

  tg: TypeGraphDS;
  runtimeReferences: Runtime[];
  root: TypeNode;
  introspection: TypeGraph | null;
  typeByName: Record<string, TypeNode>;
  secrets: Record<string, string>;
  auths: Map<string, Auth>;
  cors: Record<string, string>;

  private constructor(
    typegraph: TypeGraphDS,
    runtimeReferences: Runtime[],
    secrets: Record<string, string>,
    cors: Record<string, string>,
    auths: Map<string, Auth>,
    introspection: TypeGraph | null,
  ) {
    this.tg = typegraph;
    this.runtimeReferences = runtimeReferences;
    this.root = this.type(0);
    this.secrets = secrets;
    this.cors = cors;
    this.auths = auths;
    this.introspection = introspection;
    // this.typeByName = this.tg.types.reduce((agg, tpe) => ({ ...agg, [tpe.name]: tpe }), {});
    const typeByName: Record<string, TypeNode> = {};
    typegraph.types.forEach((tpe) => {
      typeByName[tpe.name] = tpe;
    });
    this.typeByName = typeByName;
  }

  static async init(
    typegraph: TypeGraphDS,
    staticReference: RuntimeResolver,
    introspection: TypeGraph | null,
    runtimeConfig: RuntimesConfig,
  ): Promise<TypeGraph> {
    const typegraphName = typegraph.types[0].name;
    const { meta, runtimes } = typegraph;

    const secrets = meta.secrets.sort().reduce(
      (agg, secretName) => {
        return { ...agg, [secretName]: envOrFail(typegraphName, secretName) };
      },
      {},
    );

    const cors = (() => {
      if (meta.cors.allow_origin.length === 0) {
        return {};
      }
      const ret: Record<string, string> = {
        "Access-Control-Allow-Origin": meta.cors.allow_origin.join(","),
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": [nextAuthorizationHeader].concat(
          meta.cors.allow_headers,
        ).join(","),
        "Access-Control-Expose-Headers": meta.cors.expose_headers.join(","),
        "Access-Control-Allow-Credentials": meta.cors.allow_credentials
          .toString(),
      };
      if (meta.cors.max_age) {
        ret["Access-Control-Max-Age"] = meta.cors.max_age.toString();
      }
      return ret;
    })();

    const auths = new Map<string, Auth>();
    for (const auth of meta.auths) {
      auths.set(
        auth.name,
        await Auth.init(typegraphName, auth),
      );
    }

    const runtimeReferences = await Promise.all(
      runtimes.map((runtime, idx) => {
        if (runtime.name in staticReference) {
          return staticReference[runtime.name];
        }

        ensure(
          runtime.name in runtimeInit,
          `cannot find runtime "${runtime.name}" in ${
            Object.keys(
              runtimeInit,
            ).join(", ")
          }`,
        );

        console.log(`init ${runtime.name} (${idx})`);
        return runtimeInit[runtime.name]({
          typegraph,
          materializers: typegraph.materializers.filter(
            (mat) => mat.runtime === idx,
          ),
          args: runtime.data,
          config: runtimeConfig[runtime.name] ?? {},
        });
      }),
    );

    compileCodes(typegraph);

    return new TypeGraph(
      typegraph,
      runtimeReferences,
      secrets,
      cors,
      auths,
      introspection,
    );
  }

  async deinit(): Promise<void> {
    for await (
      const [idx, runtime] of this.runtimeReferences.map(
        (rt, i) => [i, rt] as const,
      )
    ) {
      console.log(`deinit runtime ${idx}`);
      await runtime.deinit();
    }
  }

  type(idx: number): TypeNode {
    ensure(
      typeof idx === "number" && idx < this.tg.types.length,
      `cannot find type with "${idx}" index`,
    );
    return this.tg.types[idx];
  }

  materializer(idx: number): TypeMaterializer {
    return this.tg.materializers[idx];
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
  ): [
    ComputeArg,
    Record<string, string[]>,
    string[],
  ] | null {
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
      inject,
      injection,
    } = arg.data;

    if (injection) {
      ensure(!fieldArg, "cannot set injected arg");

      switch (injection) {
        case "raw": {
          const value = JSON.parse(inject as string);
          return [() => value, policies, []];
        }
        case "secret": {
          const name = inject as string;
          return [() => this.secrets[name], policies, []];
        }
        case "context": {
          const name = inject as string;
          return [
            (_parent, _variables, { [name]: value }) => value,
            policies,
            [],
          ];
        }
        case "parent": {
          const ref = inject as number;
          const name = Object.keys(parentContext).find(
            (name) => parentContext[name] === ref,
          );
          if (!name) {
            throw Error(
              `cannot find injection ${
                JSON.stringify(
                  arg,
                )
              } in context ${JSON.stringify(parentContext)}`,
            );
          }
          return [({ [name]: value }) => value, policies, [name]];
        }
        default:
          ensure(false, "cannot happen");
      }
    }

    if (!fieldArg) {
      if (arg.typedef === "optional") {
        return !noDefault && defaultValue
          ? [() => defaultValue, policies, []]
          : null;
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

        return [
          (ctx, vars) => mapo(values, (e) => e(ctx, vars)),
          policies,
          deps,
        ];
      }

      throw Error(`mandatory arg ${JSON.stringify(arg)} not found`);
    }

    if (arg.typedef === "optional") {
      return this.collectArg(fieldArg, arg.data.of, parentContext);
    }

    const { value: argValue } = fieldArg;
    const { kind } = argValue;

    if (kind === Kind.VARIABLE) {
      const { kind: _, value: varName } = (argValue as ast.VariableNode).name;
      return [
        (_ctx, vars) =>
          vars == null
            ? (vars: Record<string, unknown> | null) =>
              vars == null ? varName : vars[varName]
            : vars[varName],
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

      return [(ctx, vars) => mapo(values, (e) => e(ctx, vars)), policies, deps];
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

      return [(ctx, vars) => values.map((e) => e(ctx, vars)), policies, deps];
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
      const { value } = argValue as ast.BooleanValueNode;
      const parsed = Boolean(value);
      return [() => parsed, policies, []];
    }

    if (arg.typedef === "float") {
      ensure(
        kind === Kind.FLOAT || kind === Kind.INT,
        `type mismatch, got ${kind} but expected FLOAT for ${arg.name}`,
      );
      const { value } = argValue as ast.FloatValueNode;
      const parsed = Number(value);
      return [() => parsed, policies, []];
    }

    if (
      arg.typedef === "string" ||
      arg.typedef === "uuid" ||
      arg.typedef === "email" ||
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
    const parentType = this.type(parentIdx) as StructNode;
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
            outType: dummyStringTypeNode,
            // singleton
            runtime: DenoRuntime.init({
              typegraph: this.tg,
              materializers: [],
              args: {},
              config: {},
            }),
            batcher: this.nextBatcher(dummyStringTypeNode),
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

        const runtime = this.runtimeReferences[fieldType.runtime];

        const stage = new ComputeStage({
          dependencies: parentStage ? [parentStage.id()] : [],
          parent: parentStage,
          args: {},
          policies,
          outType: fieldType,
          runtime,
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
          this.type(fieldType.data.of).typedef === "list"
        ) {
          const subTypeIdx = fieldType.data.of;
          const subType = this.type(subTypeIdx) as ListNode;
          const subSubTypeIdx = subType.data.of;
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
          const subTypeIdx = fieldType.data.of;
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

      const { input: inputIdx, output: outputIdx } = fieldType.data;
      const outputType = this.type(outputIdx);
      const checks = outputType.policies.map((p) => this.policy(p).name);
      if (checks.length > 0) {
        policies[outputType.name] = checks;
      }
      const args: Record<string, ComputeArg> = {};

      const argSchema = (this.tg.types[inputIdx] as StructNode).data
        .binds as Record<
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
      const runtime = this.runtimeReferences[mat.runtime];

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
        runtime,
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
        this.type(outputType.data.of).typedef === "list"
      ) {
        const subTypeIdx = outputType.data.of;
        const subType = this.type(subTypeIdx) as ListNode;
        const subSubTypeIdx = subType.data.of;
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
        const subTypeIdx = outputType.data.of;
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
          const rt = this.introspection
            .runtimeReferences[mat.runtime] as DenoRuntime; // temp
          return [introPolicy.name, rt.delegate(mat, false)] as [
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
      const rt = this.runtimeReferences[mat.runtime] as DenoRuntime;
      ensure(
        rt.constructor === DenoRuntime,
        "runtime for policy must be a DenoRuntime",
      );
      return [policy.name, rt.delegate(mat, false)] as [string, Resolver];
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

    if (type.typedef === "list") {
      if (this.type(type.data.of).typedef === "optional") {
        throw Error("D");
        //return (x: any) => x.flat().filter((c: any) => !!c);
      }
      return (x: any) => ensureArray(x).flat();
    }
    if (type.typedef === "optional") {
      if (this.type(type.data.of).typedef === "list") {
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
        type.typedef === "unsigned_integer" ||
        type.typedef === "boolean" ||
        type.typedef === "gen" ||
        type.typedef === "uuid" ||
        type.typedef === "string" ||
        type.typedef === "email",
      `struct expected but got ${type.typedef}`,
    );
    return (x: any) => ensureArray(x);
  };

  typeByNameOrIndex(nameOrIndex: string | number): TypeNode {
    if (typeof nameOrIndex === "number") {
      return this.type(nameOrIndex);
    }
    const tpe = this.typeByName[nameOrIndex];
    if (tpe == null) {
      if (nameOrIndex.endsWith("Inp")) {
        // Input types are suffixed with "Inp" on the playground docs
        return this.typeByNameOrIndex(nameOrIndex.slice(0, -3));
      }
      throw new Error(`type ${nameOrIndex} not found`);
    }
    return tpe;
  }

  validateValueType(
    nameOrIndex: string | number,
    value: unknown,
    label: string,
  ) {
    const tpe = this.typeByNameOrIndex(nameOrIndex);

    if (tpe.typedef === "optional") {
      if (value == null) return;
      this.validateValueType(tpe.data.of as number, value, label);
      return;
    }

    if (value == null) {
      throw new Error(`variable ${label} cannot be null`);
    }

    switch (tpe.typedef) {
      case "struct":
        if (typeof value !== "object") {
          throw new Error(`variable ${label} must be an object`);
        }
        Object.entries(tpe.data.binds as Record<string, number>).forEach(
          ([key, typeIdx]) => {
            this.validateValueType(
              typeIdx,
              (value as Record<string, unknown>)[key],
              `${label}.${key}`,
            );
          },
        );
        return;
      case "list":
        if (!Array.isArray(value)) {
          throw new Error(`variable ${label} must be an array`);
        }
        value.forEach((item, idx) => {
          this.validateValueType(
            tpe.data.of as number,
            item,
            `${label}[${idx}]`,
          );
        });
        return;
      case "integer":
      case "unsigned_integer":
      case "float":
        if (typeof value !== "number") {
          throw new Error(`variable ${label} must be a number`);
        }
        return;
      case "boolean":
        if (typeof value !== "boolean") {
          throw new Error(`variable ${label} must be a boolean`);
        }
        return;
      case "string":
        if (typeof value !== "string") {
          throw new Error(`variable ${label} must be a string`);
        }
        return;
      case "uuid":
        if (!uuid.validate(value as string)) {
          throw new Error(`variable ${label} must be a valid UUID`);
        }
        return;
      default:
        throw new Error(`unsupported type ${tpe.typedef}`);
    }
  }
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
