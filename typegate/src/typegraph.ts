// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import type * as ast from "graphql/ast";
import { Kind } from "graphql";
import { ComputeStage } from "./engine.ts";
import { FragmentDefs } from "./graphql.ts";
import { DenoRuntime } from "./runtimes/deno.ts";
import { GoogleapisRuntime } from "./runtimes/googleapis.ts";
import { GraphQLRuntime } from "./runtimes/graphql.ts";
import { HTTPRuntime } from "./runtimes/http.ts";
import { PrismaRuntime } from "./runtimes/prisma.ts";
import { RandomRuntime } from "./runtimes/random.ts";
import { Runtime } from "./runtimes/Runtime.ts";
import { ensure, envOrFail } from "./utils.ts";

import { Auth, AuthDS, nextAuthorizationHeader } from "./auth/auth.ts";
import * as semver from "std/semver/mod.ts";

import {
  isArray,
  isBoolean,
  isFunction,
  isInteger,
  isNumber,
  isObject,
  isOptional,
  isString,
  TypeNode,
} from "./type_node.ts";
import config from "./config.ts";
import {
  Batcher,
  Context,
  Operation,
  PolicyStages,
  PolicyStagesFactory,
  Resolver,
  RuntimeInit,
  RuntimesConfig,
} from "./types.ts";
import { S3Runtime } from "./runtimes/s3.ts";

interface Policy {
  name: string;
  materializer: number;
}

interface SpecialPolicy {
  name: string;
  function: number;
}

export type TypePolicy = Policy | SpecialPolicy;

export interface TypeMaterializer {
  name: string;
  runtime: number;
  data: Record<string, unknown>;
}

export interface TypeRuntime {
  name: string;
  data: Record<string, unknown>;
}

export interface Rate {
  window_limit: number;
  window_sec: number;
  query_limit: number;
  local_excess: number;
  context_identifier: string;
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
  rate: Rate | null;
  version: string;
}

export interface TypeGraphDS {
  types: Array<TypeNode>;
  materializers: Array<TypeMaterializer>;
  runtimes: Array<TypeRuntime>;
  policies: Array<TypePolicy>;
  meta: TypeMeta;
}

export type RuntimeResolver = Record<string, Runtime>;

interface TraverseParams {
  operation: Operation;
  fragments: FragmentDefs;
  parentName: string;
  parentArgs: readonly ast.ArgumentNode[];
  parentSelectionSet: ast.SelectionSetNode;
  verbose: boolean;
  queryPath?: string[];
  parentIdx: number;
  parentStage?: ComputeStage;
  serial?: boolean;
}

const runtimeInit: RuntimeInit = {
  s3: S3Runtime.init,
  graphql: GraphQLRuntime.init,
  prisma: PrismaRuntime.init,
  http: HTTPRuntime.init,
  deno: DenoRuntime.init,
  googleapis: GoogleapisRuntime.init,
  random: RandomRuntime.init,
  //typegraph: TypeGraphRuntime.init,
};

const typegraphVersion = "0.0.1";
const typegraphChangelog: Record<
  string,
  { next: string; transform: (x: TypeGraphDS) => TypeGraphDS }
> = {
  "0.0.0": {
    "next": "0.0.1",
    "transform": (x) => x,
  },
};

interface TypegraphTraverseParams {
  fragments: FragmentDefs;
  parentName: string;
  readonly parentArgs: ast.ArgumentNode[];
  parentSelectionSet: ast.SelectionSetNode;
  verbose: boolean;
  queryPath?: string;
  parentIdx?: number;
  parentStage?: ComputeStage;
  serial: boolean;
}

export class TypeGraph {
  static readonly emptyArgs: ast.ArgumentNode[] = [];
  static emptyFields: ast.SelectionSetNode = {
    kind: Kind.SELECTION_SET,
    selections: [],
  };

  static typenameType: TypeNode = {
    title: "string",
    type: "string",
    policies: [],
    runtime: -1,
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
      typeByName[tpe.title] = tpe;
    });
    this.typeByName = typeByName;
  }

  get name() {
    return this.root.title;
  }

  static async init(
    typegraph: TypeGraphDS,
    staticReference: RuntimeResolver,
    introspection: TypeGraph | null,
    runtimeConfig: RuntimesConfig,
  ): Promise<TypeGraph> {
    const typegraphName = typegraph.types[0].title;
    const { meta, runtimes } = typegraph;

    let currentVersion = meta.version;
    while (semver.neq(typegraphVersion, currentVersion)) {
      const migration = typegraphChangelog[currentVersion];
      if (!migration) {
        throw Error(
          `typegate ${config.version} supports typegraph ${typegraphVersion} which is incompatible with ${typegraphName} ${meta.version} (max auto upgrade was ${currentVersion})`,
        );
      }
      typegraph = migration.transform(typegraph);
      currentVersion = migration.next;
    }

    const secrets: Record<string, string> = meta.secrets.sort().reduce(
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
        "Access-Control-Allow-Headers": [
          nextAuthorizationHeader,
          "Cache-Control",
          "Content-Language",
          "Content-Type",
        ].concat(
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

    const tg = new TypeGraph(
      typegraph,
      runtimeReferences,
      secrets,
      cors,
      auths,
      introspection,
    );

    return tg;
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
    if (this.introspection) {
      await this.introspection.deinit();
    }

    for await (
      const runtime of Object.values(DenoRuntime.getInstancesIn(this.name))
    ) {
      await runtime.deinit();
    }
  }

  type(idx: number): TypeNode;
  type<T extends TypeNode["type"]>(
    idx: number,
    asType: T,
  ): TypeNode & { type: T };
  type<T extends TypeNode["type"]>(
    idx: number,
    asType?: T,
  ): TypeNode {
    ensure(
      typeof idx === "number" && idx < this.tg.types.length,
      `cannot find type with "${idx}" index`,
    );
    const ret = this.tg.types[idx];
    if (asType != undefined) {
      if (ret.type !== asType) {
        throw new Error(`Expected type '${asType}', got '${ret.type}'`);
      }
    }

    return ret;
  }

  materializer(idx: number): TypeMaterializer {
    return this.tg.materializers[idx];
  }

  policyMaterializer(policy: TypePolicy): TypeMaterializer {
    const matIdx = "materializer" in policy
      ? policy.materializer
      : this.type(policy.function, "function").materializer;
    return this.materializer(matIdx);
  }

  runtime(idx: number): TypeRuntime {
    return this.tg.runtimes[idx];
  }

  policy(idx: number): TypePolicy {
    return this.tg.policies[idx];
  }

  parseSecret(
    schema: TypeNode,
    name: string,
  ) {
    const value = this.secrets[name];
    if (value == undefined) {
      if (isOptional(schema)) {
        return null;
      }
      // manage default?
      throw new Error(`injection ${name} was not found in secrets`);
    }

    if (isNumber(schema)) return parseFloat(value);
    if (isInteger(schema)) return parseInt(value, 10);

    if (isString(schema)) return value;

    throw new Error(
      `invalid type for secret injection: ${schema.type}`,
    );
  }
  // value, policies, dependencies
  // collectArg(
  //   fieldArg: ast.ArgumentNode | ast.ObjectFieldNode | undefined,
  //   argIdx: number,
  //   parentContext: Record<string, number>,
  //   noDefault = false,
  // ): [
  //   compute: ComputeArg,
  //   policies: Record<string, string[]>,
  //   deps: string[],
  // ] | null {
  //   const arg = this.tg.types[argIdx];

  //   if (!arg) {
  //     throw Error(`${argIdx} not found in type`);
  //   }

  //   let policies = arg.policies.length > 0
  //     ? {
  //       [arg.title]: arg.policies.map((p) => this.policy(p).name),
  //     }
  //     : {};

  //   if ("injection" in arg) {
  //     const { injection, inject } = arg;
  //     ensure(!fieldArg, "cannot set injected arg");

  //     switch (injection) {
  //       case "raw": {
  //         const value = JSON.parse(inject as string);
  //         // typecheck
  //         return [() => value, policies, []];
  //       }
  //       case "secret": {
  //         const name = inject as string;
  //         const value = this.parseSecret(arg, name);

  //         return [() => value, policies, []];
  //       }
  //       case "context": {
  //         const name = inject as string;
  //         return [
  //           (_variables, _parent, context) => {
  //             const { [name]: value } = context;
  //             if (
  //               value === undefined &&
  //               (value === null && !isOptional(arg))
  //             ) {
  //               // manage default?
  //               throw new Error(`injection ${name} was not found in context`);
  //             }
  //             return value;
  //           },
  //           policies,
  //           [],
  //         ];
  //       }
  //       case "parent": {
  //         const ref = inject as number;
  //         const name = Object.keys(parentContext).find(
  //           (name) => parentContext[name] === ref,
  //         );
  //         if (!name) {
  //           throw Error(
  //             `cannot find injection ${
  //               JSON.stringify(
  //                 arg,
  //               )
  //             } in parent ${JSON.stringify(parentContext)}`,
  //           );
  //         }
  //         return [
  //           ({ [name]: value }) => {
  //             if (
  //               value === undefined &&
  //               (value === null && !isOptional(arg))
  //             ) {
  //               // manage default?
  //               throw new Error(`injection ${name} was not found in parent`);
  //             }
  //             return value;
  //           },
  //           policies,
  //           [name],
  //         ];
  //       }
  //       default:
  //         ensure(false, "cannot happen");
  //     }
  //   }

  //   if (!fieldArg) {
  //     if (isOptional(arg)) {
  //       const { default_value: defaultValue } = arg;
  //       return !noDefault && defaultValue
  //         ? [() => defaultValue, policies, []]
  //         : null;
  //     }

  //     if (isObject(arg)) {
  //       const argSchema = arg.properties;
  //       const values: Record<string, any> = {};
  //       const deps = [];

  //       for (const [fieldName, fieldIdx] of Object.entries(argSchema)) {
  //         const nested = this.collectArg(
  //           undefined,
  //           fieldIdx,
  //           parentContext,
  //           true,
  //         );
  //         if (!nested) {
  //           continue;
  //         }
  //         const [value, nestedPolicies, nestedDeps] = nested;
  //         deps.push(...nestedDeps);
  //         values[fieldName] = value;
  //         policies = { ...policies, ...nestedPolicies };
  //       }

  //       if (Object.values(values).length < 1) {
  //         throw Error(`mandatory arg ${JSON.stringify(arg)} not found`);
  //       }

  //       return [
  //         (ctx, vars) => mapo(values, (e) => e(ctx, vars)),
  //         policies,
  //         deps,
  //       ];
  //     }

  //     throw Error(`mandatory arg ${JSON.stringify(arg)} not found`);
  //   }

  //   if (isOptional(arg)) {
  //     return this.collectArg(fieldArg, arg.item, parentContext);
  //   }

  //   const { value: argValue } = fieldArg;
  //   const { kind } = argValue;

  //   if (kind === Kind.VARIABLE) {
  //     const { kind: _, value: varName } = (argValue as ast.VariableNode).name;
  //     return [
  //       (_ctx, vars) =>
  //         vars == null
  //           ? (vars: Record<string, unknown> | null) =>
  //             vars == null ? varName : vars[varName]
  //           : vars[varName],
  //       policies,
  //       [],
  //     ];
  //   }

  //   if (isObject(arg)) {
  //     ensure(
  //       kind === Kind.OBJECT,
  //       `type mismatch, got ${kind} but expected OBJECT for ${arg.title}`,
  //     );
  //     const { fields } = argValue as ast.ObjectValueNode;
  //     const argSchema = arg.properties as Record<string, number>;

  //     const fieldArgsIdx: Record<string, ast.ObjectFieldNode> = fields.reduce(
  //       (agg, fieldArg) => ({ ...agg, [fieldArg.name.value]: fieldArg }),
  //       {},
  //     );

  //     const values: Record<string, any> = {};
  //     const deps = [];

  //     for (const [fieldName, fieldIdx] of Object.entries(argSchema)) {
  //       const nested = this.collectArg(
  //         fieldArgsIdx[fieldName],
  //         fieldIdx,
  //         parentContext,
  //       );
  //       if (!nested) {
  //         continue;
  //       }
  //       const [value, nestedPolicies, nestedDeps] = nested;
  //       deps.push(...nestedDeps);
  //       // FIXME
  //       // const renames = arg.renames ?? {}
  //       const renames = {} as Record<string, string>;
  //       values[renames[fieldName] ?? fieldName] = value;
  //       delete fieldArgsIdx[fieldName];
  //       policies = { ...policies, ...nestedPolicies };
  //     }

  //     for (const name of Object.keys(fieldArgsIdx)) {
  //       throw Error(`${name} input as field but unknown`);
  //     }

  //     return [(ctx, vars) => mapo(values, (e) => e(ctx, vars)), policies, deps];
  //   }

  //   if (isArray(arg)) {
  //     ensure(
  //       kind === Kind.LIST,
  //       `type mismatch, got ${kind} but expected LIST for ${arg.title}`,
  //     );
  //     const { values: valueOfs } = argValue as ast.ListValueNode;
  //     const valueIdx = arg.items as number;

  //     const values: any[] = [];
  //     const deps = [];

  //     // likely optimizable as type should be shared
  //     for (const valueOf of valueOfs) {
  //       const nested = this.collectArg(
  //         { value: valueOf } as unknown as ast.ArgumentNode,
  //         valueIdx,
  //         parentContext,
  //       );
  //       if (!nested) {
  //         throw Error("unknown subtype");
  //       }
  //       const [value, nestedPolicies, nestedDeps] = nested;
  //       deps.push(...nestedDeps);
  //       values.push(value);
  //       policies = { ...policies, ...nestedPolicies };
  //     }

  //     return [(ctx, vars) => values.map((e) => e(ctx, vars)), policies, deps];
  //   }

  //   if (isInteger(arg)) {
  //     ensure(
  //       kind === Kind.INT,
  //       `type mismatch, got ${kind} but expected INT for ${arg.title}`,
  //     );
  //     const { value } = argValue as ast.IntValueNode;
  //     const parsed = Number(value);
  //     return [() => parsed, policies, []];
  //   }

  //   if (isNumber(arg)) {
  //     ensure(
  //       kind === Kind.FLOAT || kind === Kind.INT,
  //       `type mismatch, got ${kind} but expected FLOAT for ${arg.title}`,
  //     );
  //     const { value } = argValue as ast.FloatValueNode;
  //     const parsed = Number(value);
  //     return [() => parsed, policies, []];
  //   }

  //   if (isBoolean(arg)) {
  //     ensure(
  //       kind === Kind.BOOLEAN,
  //       `type mismatch, got ${kind} but expected BOOLEAN for ${arg.title}`,
  //     );
  //     const { value } = argValue as ast.BooleanValueNode;
  //     const parsed = Boolean(value);
  //     return [() => parsed, policies, []];
  //   }

  //   if (isString(arg)) {
  //     ensure(
  //       kind === Kind.STRING,
  //       `type mismatch, got ${kind} but expected STRING for ${arg.title}`,
  //     );
  //     const { value } = argValue as ast.StringValueNode;
  //     const parsed = String(value);
  //     return [() => parsed, policies, []];
  //   }

  //   throw Error(
  //     `unknown variable value ${JSON.stringify(arg)} ${JSON.stringify(fieldArg)}
  //     (${kind}) for ${arg.title}`,
  //   );
  // }

  preparePolicies(
    stages: ComputeStage[],
  ): PolicyStagesFactory {
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
          const mat = this.introspection.policyMaterializer(
            introPolicy,
          );
          const rt = this.introspection
            .runtimeReferences[mat.runtime] as DenoRuntime;
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

      const mat = this.policyMaterializer(policy);
      const rt = this.runtimeReferences[mat.runtime] as DenoRuntime;
      ensure(
        rt.constructor === DenoRuntime,
        "runtime for policy must be a DenoRuntime",
      );
      return [policy.name, rt.delegate(mat, false)] as [string, Resolver];
    });

    return (context: Context) => {
      const ret: PolicyStages = {};
      for (const [policyName, resolver] of policies) {
        // for policies, the context becomes the args
        ret[policyName] = async (args: Record<string, unknown>) =>
          await lazyResolver<boolean | null>(resolver)({
            ...args,
            _: {
              parent: {},
              context,
              variables: {},
            },
          });
      }
      return ret;
    };
  }

  nextBatcher = (
    type: TypeNode,
  ): Batcher => {
    // convenience check to be removed
    const ensureArray = (x: []) => {
      ensure(Array.isArray(x), `${JSON.stringify(x)} not an array`);
      return x;
    };

    if (isArray(type)) {
      if (isOptional(this.type(type.items))) {
        throw Error("D");
        //return (x: any) => x.flat().filter((c: any) => !!c);
      }
      return (x: any) => ensureArray(x).flat();
    }
    if (isOptional(type)) {
      if (isArray(this.type(type.item))) {
        return (x: any) =>
          ensureArray(x)
            .filter((c: any) => !!c)
            .flat();
      }
      return (x: any) => ensureArray(x).filter((c: any) => !!c);
    }
    ensure(
      isObject(type) || isInteger(type) || isNumber(type) || isBoolean(type) ||
        isFunction(type) || isString(type),
      `object expected but got ${type.type}`,
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

    if (isOptional(tpe)) {
      if (value == null) return;
      this.validateValueType(tpe.item as number, value, label);
      return;
    }

    if (value == null) {
      throw new Error(`variable ${label} cannot be null`);
    }

    switch (tpe.type) {
      case "object":
        if (typeof value !== "object") {
          throw new Error(`variable ${label} must be an object`);
        }
        Object.entries(tpe.properties).forEach(
          ([key, typeIdx]) => {
            this.validateValueType(
              typeIdx,
              (value as Record<string, unknown>)[key],
              `${label}.${key}`,
            );
          },
        );
        return;
      case "array":
        if (!Array.isArray(value)) {
          throw new Error(`variable ${label} must be an array`);
        }
        value.forEach((item, idx) => {
          this.validateValueType(
            tpe.items,
            item,
            `${label}[${idx}]`,
          );
        });
        return;
      case "integer":
      case "number":
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
      // case "uuid":
      //   if (!uuid.validate(value as string)) {
      //     throw new Error(`variable ${label} must be a valid UUID`);
      //   }
      //   return;
      default:
        throw new Error(`unsupported type ${tpe.type}`);
    }
  }
}

const lazyResolver = <T>(
  fn: Resolver,
): Resolver => {
  let memo: Promise<T> | undefined = undefined;
  // deno-lint-ignore require-await
  return async (args) => {
    if (!memo) {
      // no need to wait, the resolver executor will
      memo = fn(args);
    }
    return memo;
  };
};
