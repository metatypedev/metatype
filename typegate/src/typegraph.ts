// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import type * as ast from "graphql/ast";
import { Kind } from "graphql";
import { ComputeStage } from "./engine.ts";
import { DenoRuntime } from "./runtimes/deno.ts";
import { GoogleapisRuntime } from "./runtimes/googleapis.ts";
import { GraphQLRuntime } from "./runtimes/graphql.ts";
import { HTTPRuntime } from "./runtimes/http.ts";
import { PrismaRuntime } from "./runtimes/prisma.ts";
import { RandomRuntime } from "./runtimes/random.ts";
import { Runtime } from "./runtimes/Runtime.ts";
import { ensure, envOrFail } from "./utils.ts";

import { Auth, nextAuthorizationHeader } from "./auth/auth.ts";
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
  PolicyStages,
  PolicyStagesFactory,
  Resolver,
  RuntimeInit,
  RuntimesConfig,
} from "./types.ts";
import { S3Runtime } from "./runtimes/s3.ts";

import type {
  Cors,
  Materializer as TypeMaterializer,
  Policy as TypePolicy,
  Rate,
  TGRuntime as TypeRuntime,
  Typegraph as TypeGraphDS,
} from "./types/typegraph.ts";

export { Cors, Rate, TypeGraphDS, TypeMaterializer, TypePolicy, TypeRuntime };

export type RuntimeResolver = Record<string, Runtime>;

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
  root: TypeNode;
  typeByName: Record<string, TypeNode>;

  private constructor(
    typegraph: TypeGraphDS,
    public runtimeReferences: Runtime[],
    private secrets: Record<string, string>,
    public cors: (req: Request) => Record<string, string>,
    public auths: Map<string, Auth>,
    public introspection: TypeGraph | null,
  ) {
    this.tg = typegraph;
    this.root = this.type(0);
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

    const staticCors: Record<string, string> = {
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
      staticCors["Access-Control-Max-Age"] = meta.cors.max_age.toString();
    }
    const exposeOrigins = new Set(meta.cors.expose_headers);

    const cors = (req: Request) => {
      if (meta.cors.allow_origin.length === 0) {
        return {};
      }
      const origin = req.headers.get("origin");
      if (!origin || exposeOrigins.has(origin)) {
        return {};
      }
      return {
        ...staticCors,
        "Access-Control-Allow-Origin": origin,
      };
    };

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
    const matIdx = policy.materializer;
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
