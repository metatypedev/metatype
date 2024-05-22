// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import type * as ast from "graphql/ast";
import { Kind } from "graphql";
import type { DenoRuntime } from "../runtimes/deno/deno.ts";
import { Runtime } from "../runtimes/Runtime.ts";
import { ensure, ensureNonNullable } from "../utils.ts";
import { typegraph_validate } from "native";
import Chance from "chance";

import {
  initAuth,
  internalAuthName,
  nextAuthorizationHeader,
} from "../services/auth/mod.ts";

import {
  isBoolean,
  isEither,
  isFunction,
  isInteger,
  isList,
  isNumber,
  isObject,
  isOptional,
  isString,
  isUnion,
  Type,
  TypeNode,
} from "./type_node.ts";
import { Batcher } from "../types.ts";

import type {
  Cors,
  Materializer as TypeMaterializer,
  Policy as TypePolicy,
  Rate,
  TGRuntime as TypeRuntime,
  Typegraph as TypeGraphDS,
} from "./types.ts";
import { InternalAuth } from "../services/auth/protocols/internal.ts";
import { Protocol } from "../services/auth/protocols/protocol.ts";
import { initRuntime } from "../runtimes/mod.ts";
import randomizeRecursively from "../runtimes/random.ts";
import { Typegate } from "../typegate/mod.ts";

export { Cors, Rate, TypeGraphDS, TypeMaterializer, TypePolicy, TypeRuntime };

export type RuntimeResolver = Record<string, Runtime>;

export class SecretManager {
  private typegraphName: string;
  constructor(
    typegraph: TypeGraphDS,
    public secrets: Record<string, string>,
  ) {
    // name without prefix as secrets are not prefixed
    this.typegraphName = TypeGraph.formatName(typegraph, false);
  }

  secretOrFail(
    name: string,
  ): string {
    const value = this.secretOrNull(name);
    ensure(
      value != null,
      `cannot find secret "${name}" for "${this.typegraphName}"`,
    );
    return value as string;
  }

  secretOrNull(
    name: string,
  ): string | null {
    return this.secrets[name] ?? null;
  }
}

const GRAPHQL_SCALAR_TYPES = {
  [Type.BOOLEAN]: "Boolean",
  [Type.INTEGER]: "Int",
  [Type.FLOAT]: "Float",
  [Type.STRING]: "String",
} as Partial<Record<TypeNode["type"], string>>;

export class TypeGraph implements AsyncDisposable {
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
    as_id: false,
  };

  root: TypeNode;
  typeByName: Record<string, TypeNode>;
  name: string;

  private constructor(
    public typegate: Typegate,
    public tg: TypeGraphDS,
    public secretManager: SecretManager,
    public denoRuntimeIdx: number,
    public runtimeReferences: Runtime[],
    public cors: (req: Request) => Record<string, string>,
    public auths: Map<string, Protocol>,
    public introspection: TypeGraph | null,
  ) {
    this.root = this.type(0);
    this.name = TypeGraph.formatName(tg);
    this.name = TypeGraph.formatName(tg);
    const typeByName: Record<string, TypeNode> = {};
    for (const tpe of tg.types) {
      typeByName[tpe.title] = tpe;
    }
    this.typeByName = typeByName;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await Promise.all(this.runtimeReferences.map((r) => r.deinit()));
    if (this.introspection) {
      await this.introspection[Symbol.asyncDispose]();
    }
  }

  get rawName() {
    return this.root.title;
  }

  static formatName(tg: TypeGraphDS, prefix = true): string {
    const name = tg.types[0].title;
    if (!prefix) {
      return name;
    }
    return `${tg.meta.prefix ?? ""}${name}`;
  }

  static async parseJson(json: string): Promise<TypeGraphDS> {
    const res = await typegraph_validate({ json });
    if ("Valid" in res) {
      return JSON.parse(res.Valid.json) as TypeGraphDS;
    } else {
      let name;
      try {
        name = TypeGraph.formatName(JSON.parse(json));
      } catch (_e) {
        name = "<unknown>";
      }
      throw new Error(
        `Invalid typegraph definition for '${name}': ${res.NotValid.reason}`,
      );
    }
  }

  static async init(
    typegate: Typegate,
    typegraph: TypeGraphDS,
    secretManager: SecretManager,
    staticReference: RuntimeResolver,
    introspection: TypeGraph | null,
  ): Promise<TypeGraph> {
    const typegraphName = TypeGraph.formatName(typegraph);
    const { meta, runtimes } = typegraph;

    // check mandatory secrets for injection
    meta.secrets.forEach((s) => secretManager.secretOrFail(s));

    const staticCors: Record<string, string> = {
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": Array.from(
        new Set([
          // https://developer.mozilla.org/en-US/docs/Glossary/CORS-safelisted_request_header
          "Cache-Control",
          "Content-Type",
          "Authorization",
          ...meta.cors.allow_headers,
        ]),
      ).join(","),
      "Access-Control-Expose-Headers": Array.from(
        new Set([nextAuthorizationHeader, ...meta.cors.expose_headers]),
      ).join(","),
      "Access-Control-Allow-Credentials": meta.cors.allow_credentials
        .toString(),
    };
    if (meta.cors.max_age_sec) {
      staticCors["Access-Control-Max-Age"] = meta.cors.max_age_sec.toString();
    }
    const allowedOrigins = new Set(meta.cors.allow_origin);
    const wildcardOrigin = allowedOrigins.has("*");

    const cors = (req: Request) => {
      const origin = req.headers.get("origin");
      if (wildcardOrigin || (origin && allowedOrigins.has(origin))) {
        return {
          ...staticCors,
          "Access-Control-Allow-Origin": origin,
        };
      }
      return {};
    };

    // this is not the best implementation for auth function
    // however, it is the simplest one for now
    const denoRuntimeIdx = runtimes.findIndex((r) => r.name === "deno");
    ensure(denoRuntimeIdx !== -1, "cannot find deno runtime");

    const runtimeReferences = await Promise.all(
      runtimes.map((runtime, idx) => {
        if (runtime.name in staticReference) {
          return staticReference[runtime.name];
        }

        const materializers = typegraph.materializers.filter(
          (mat) => mat.runtime === idx,
        );

        return initRuntime(runtime.name, {
          typegate,
          typegraph,
          typegraphName,
          materializers,
          args: (runtime as any)?.data ?? {},
          secretManager,
        });
      }),
    );

    const denoRuntime = runtimeReferences[denoRuntimeIdx];

    ensureNonNullable(denoRuntime, "cannot find deno runtime");

    const auths = new Map<string, Protocol>();
    const tg = new TypeGraph(
      typegate,
      typegraph,
      secretManager,
      denoRuntimeIdx,
      runtimeReferences,
      cors,
      auths,
      introspection,
    );

    for (const auth of meta.auths) {
      auths.set(
        auth.name,
        await initAuth(
          typegraphName,
          auth,
          secretManager,
          denoRuntime as DenoRuntime,
          {
            tg: tg, // required for validation
            runtimeReferences,
          },
        ),
      );
    }

    // override "internal" to enforce internal auth
    auths.set(
      internalAuthName,
      await InternalAuth.init(typegraphName, typegate.cryptoKeys),
    );

    return tg;
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
      `cannot find type with index '${idx}'`,
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
    const value = this.secretManager.secretOrNull(name);
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

  getRandom(
    schema: TypeNode,
  ): number | string | null {
    const tgTypes: TypeNode[] = this.tg.types;
    let seed = 12; // default seed
    if (
      this.tg.meta.randomSeed !== undefined &&
      this.tg.meta.randomSeed !== null
    ) {
      seed = this.tg.meta.randomSeed;
    }
    const chance: typeof Chance = new Chance(seed);

    try {
      const result = randomizeRecursively(schema, chance, tgTypes);

      return result;
    } catch (_) {
      throw new Error(
        `invalid type for random injection: ${schema.type}`,
      );
    }
  }

  nextBatcher = (
    type: TypeNode,
  ): Batcher => {
    // convenience check to be removed
    const ensureArray = (x: []) => {
      ensure(Array.isArray(x), `${JSON.stringify(x)} not an array`);
      return x;
    };

    if (isList(type)) {
      if (isOptional(this.type(type.items))) {
        return (x: any) => {
          return x.flat().filter((c: any) => !!c);
        };
      }
      return (x: any) => {
        return ensureArray(x).flat();
      };
    }
    if (isOptional(type)) {
      if (isList(this.type(type.item))) {
        return (x: any) => {
          return ensureArray(x)
            .flat()
            .filter((c: any) => !!c);
        };
      }
      return (x: any) => {
        return ensureArray(x).filter((c: any) => !!c);
      };
    }
    ensure(
      isObject(type) || isInteger(type) || isNumber(type) || isBoolean(type) ||
        isFunction(type) || isString(type) || isUnion(type) || isEither(type),
      `object expected but got ${type.type}`,
    );
    return (x: any) => {
      return ensureArray(x);
    };
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

  getGraphQLType(typeNode: TypeNode, optional = false): string {
    if (typeNode.type === Type.OPTIONAL) {
      return this.getGraphQLType(this.type(typeNode.item), true);
    }

    if (!optional) {
      return `${this.getGraphQLType(typeNode, true)}!`;
    }

    if (typeNode.type === Type.LIST) {
      return `[${this.getGraphQLType(this.type(typeNode.items))}]`;
    }

    if (typeNode.type === Type.STRING) {
      if (typeNode.as_id) {
        return "ID";
      } else {
        return "String";
      }
    }
    const scalarType = GRAPHQL_SCALAR_TYPES[typeNode.type];
    if (scalarType != null) {
      return scalarType;
    }

    return typeNode.title;
  }

  isSelectionSetExpectedFor(typeIdx: number): boolean {
    const typ = this.type(typeIdx);
    if (typ.type === Type.OBJECT) {
      return true;
    }

    if (typ.type === Type.UNION) {
      // only check for first variant
      // typegraph validation ensure that all the (nested) variants are all either objects or scalars
      return this.isSelectionSetExpectedFor(typ.anyOf[0]);
    }
    if (typ.type === Type.EITHER) {
      return this.isSelectionSetExpectedFor(typ.oneOf[0]);
    }
    return false;
  }

  // return all the possible selection fields for a type node
  //  - an array of strings (for an object)
  //  - a Map<string, string[]> (for an union type)
  //  - `null` for scalar types (no selection set expected)
  getPossibleSelectionFields(
    typeIdx: number,
  ): PossibleSelectionFields {
    const typeNode = this.type(typeIdx);
    if (typeNode.type === Type.OPTIONAL) {
      return this.getPossibleSelectionFields(typeNode.item);
    }
    if (typeNode.type === Type.LIST) {
      return this.getPossibleSelectionFields(typeNode.items);
    }

    if (typeNode.type === Type.FUNCTION) {
      return this.getPossibleSelectionFields(typeNode.output);
    }

    if (typeNode.type === Type.OBJECT) {
      return new Map(
        Object.entries(typeNode.properties).map((
          [key, idx],
        ) => [key, this.getPossibleSelectionFields(idx)]),
      );
    }

    let variants: number[];
    if (typeNode.type === Type.UNION) {
      variants = typeNode.anyOf;
    } else if (typeNode.type === Type.EITHER) {
      variants = typeNode.oneOf;
    } else {
      return null;
    }

    const entries = variants.map((
      idx,
    ) => [this.type(idx).title, this.getPossibleSelectionFields(idx)] as const);

    if (entries[0][1] === null) {
      if (entries.some((e) => e[1] !== null)) {
        throw new Error(
          "Unexpected: All the variants must not expect selection set",
        );
      }
      return null;
    }

    if (entries.some((e) => e[1] === null)) {
      throw new Error("Unexpected: All the variants must expect selection set");
    }

    const expandNestedUnions = (
      entry: readonly [string, PossibleSelectionFields],
    ): Array<[string, Map<string, PossibleSelectionFields>]> => {
      const [typeName, possibleSelections] = entry;

      ensureNonNullable(possibleSelections, "unexpected");

      if (possibleSelections instanceof Map) {
        return [[typeName, possibleSelections]];
      }

      return possibleSelections.flatMap(expandNestedUnions);
    };

    const res = entries.flatMap(expandNestedUnions);
    return res;
  }

  typeWithoutQuantifiers(typeIdx: number): TypeNode {
    return this.typeNodeWithoutQuantifiers(this.type(typeIdx));
  }

  typeNodeWithoutQuantifiers(typeNode: TypeNode): TypeNode {
    if (typeNode.type === Type.OPTIONAL) {
      return this.typeWithoutQuantifiers(typeNode.item);
    }
    if (typeNode.type === Type.LIST) {
      return this.typeWithoutQuantifiers(typeNode.items);
    }
    return typeNode;
  }
}

export type PossibleSelectionFields =
  | null
  | Map<string, PossibleSelectionFields>
  | Array<[string, Map<string, PossibleSelectionFields>]>;
