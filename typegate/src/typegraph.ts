// Copyright Metatype under the Elastic License 2.0.

import type * as ast from "graphql/ast";
import { FieldNode, Kind } from "graphql";
import { ComputeStage } from "./engine.ts";
import * as graphql from "./graphql.ts";
import { FragmentDefs } from "./graphql.ts";
import { DenoRuntime } from "./runtimes/deno.ts";
import { GoogleapisRuntime } from "./runtimes/googleapis.ts";
import { GraphQLRuntime } from "./runtimes/graphql.ts";
import { HTTPRuntime } from "./runtimes/http.ts";
import { PrismaRuntime } from "./runtimes/prisma.ts";
import { RandomRuntime } from "./runtimes/random.ts";
import { Runtime } from "./runtimes/Runtime.ts";
import { ensure, envOrFail, mapo } from "./utils.ts";

import { Auth, AuthDS, nextAuthorizationHeader } from "./auth.ts";
import * as semver from "std/semver/mod.ts";

import {
  ArrayNode,
  FunctionNode,
  getWrappedType,
  isArray,
  isBoolean,
  isFunction,
  isInteger,
  isNumber,
  isObject,
  isOptional,
  isQuantifier,
  isString,
  ObjectNode,
  TypeNode,
} from "./type_node.ts";
import config from "./config.ts";
import {
  Batcher,
  ComputeArg,
  PolicyStages,
  PolicyStagesFactory,
  Resolver,
  RuntimeInit,
  RuntimesConfig,
} from "./types.ts";
import { S3Runtime } from "./runtimes/s3.ts";

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

const dummyStringTypeNode: TypeNode = {
  // FIXME: remove dummy
  title: "string",
  type: "string",
  policies: [],
  runtime: -1,
};

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

function formatPath(path: string[]) {
  return ["<root>", ...path].join(".");
}

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

  static list: TypeGraph[] = [];

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
    json: string,
    staticReference: RuntimeResolver,
    introspection: TypeGraph | null,
    runtimeConfig: RuntimesConfig,
  ): Promise<TypeGraph> {
    let typegraph: TypeGraphDS = JSON.parse(json);

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

    const tg = new TypeGraph(
      typegraph,
      runtimeReferences,
      secrets,
      cors,
      auths,
      introspection,
    );

    TypeGraph.list.push(tg);

    return tg;
  }

  async deinit(): Promise<void> {
    TypeGraph.list.splice(TypeGraph.list.findIndex((tg) => tg == this), 1);

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
        [arg.title]: arg.policies.map((p) => this.policy(p).name),
      }
      : {};

    if ("injection" in arg) {
      const { injection, inject } = arg;
      ensure(!fieldArg, "cannot set injected arg");

      switch (injection) {
        case "raw": {
          const value = JSON.parse(inject as string);
          // typecheck
          return [() => value, policies, []];
        }
        case "secret": {
          const name = inject as string;
          const value = this.parseSecret(arg, name);

          return [() => value, policies, []];
        }
        case "context": {
          const name = inject as string;
          return [
            (_parent, _variables, { [name]: value }) => {
              if (
                value === undefined &&
                (value === null && !isOptional(arg))
              ) {
                // manage default?
                throw new Error(`injection ${name} was not found in context`);
              }
              return value;
            },
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
              } in parent ${JSON.stringify(parentContext)}`,
            );
          }
          return [
            ({ [name]: value }) => {
              if (
                value === undefined &&
                (value === null && !isOptional(arg))
              ) {
                // manage default?
                throw new Error(`injection ${name} was not found in parent`);
              }
              return value;
            },
            policies,
            [name],
          ];
        }
        default:
          ensure(false, "cannot happen");
      }
    }

    if (!fieldArg) {
      if (isOptional(arg)) {
        const { default_value: defaultValue } = arg;
        return !noDefault && defaultValue
          ? [() => defaultValue, policies, []]
          : null;
      }

      if (isObject(arg)) {
        const argSchema = arg.properties;
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

    if (isOptional(arg)) {
      return this.collectArg(fieldArg, arg.item, parentContext);
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

    if (isObject(arg)) {
      ensure(
        kind === Kind.OBJECT,
        `type mismatch, got ${kind} but expected OBJECT for ${arg.title}`,
      );
      const { fields } = argValue as ast.ObjectValueNode;
      const argSchema = arg.properties as Record<string, number>;

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
        // FIXME
        // const renames = arg.renames ?? {}
        const renames = {} as Record<string, string>;
        values[renames[fieldName] ?? fieldName] = value;
        delete fieldArgsIdx[fieldName];
        policies = { ...policies, ...nestedPolicies };
      }

      for (const name of Object.keys(fieldArgsIdx)) {
        throw Error(`${name} input as field but unknown`);
      }

      return [(ctx, vars) => mapo(values, (e) => e(ctx, vars)), policies, deps];
    }

    if (isArray(arg)) {
      ensure(
        kind === Kind.LIST,
        `type mismatch, got ${kind} but expected LIST for ${arg.title}`,
      );
      const { values: valueOfs } = argValue as ast.ListValueNode;
      const valueIdx = arg.items as number;

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

    if (isInteger(arg)) {
      ensure(
        kind === Kind.INT,
        `type mismatch, got ${kind} but expected INT for ${arg.title}`,
      );
      const { value } = argValue as ast.IntValueNode;
      const parsed = Number(value);
      return [() => parsed, policies, []];
    }

    if (isNumber(arg)) {
      ensure(
        kind === Kind.FLOAT || kind === Kind.INT,
        `type mismatch, got ${kind} but expected FLOAT for ${arg.title}`,
      );
      const { value } = argValue as ast.FloatValueNode;
      const parsed = Number(value);
      return [() => parsed, policies, []];
    }

    if (isBoolean(arg)) {
      ensure(
        kind === Kind.BOOLEAN,
        `type mismatch, got ${kind} but expected BOOLEAN for ${arg.title}`,
      );
      const { value } = argValue as ast.BooleanValueNode;
      const parsed = Boolean(value);
      return [() => parsed, policies, []];
    }

    if (isString(arg)) {
      ensure(
        kind === Kind.STRING,
        `type mismatch, got ${kind} but expected STRING for ${arg.title}`,
      );
      const { value } = argValue as ast.StringValueNode;
      const parsed = String(value);
      return [() => parsed, policies, []];
    }

    throw Error(
      `unknown variable value ${JSON.stringify(arg)} ${JSON.stringify(fieldArg)}
      (${kind}) for ${arg.title}`,
    );
  }

  // selection field?
  traverseField(
    { field, traverseParams: p, parentProps }: {
      field: FieldNode;
      traverseParams: TraverseParams;
      parentProps: Record<string, number>;
    },
  ): ComputeStage[] {
    const {
      name: { value: name },
      alias: { value: alias } = {},
      arguments: args,
      // selectionSet,
    } = field;

    const path = p.queryPath ?? [];
    const policies: Record<string, string[]> = {};
    // console.log("typegraph name", this.name);
    // console.log("introspection is not null", this.introspection != null);
    // console.log({ name });

    // introspection case
    if (
      path.length < 1 && this.introspection &&
      (name === "__schema" || name === "__type")
    ) {
      const root = this.introspection.type(0) as ObjectNode;
      const stages = [
        ...this.introspection.traverse(
          p.fragments,
          p.parentName,
          p.parentArgs,
          {
            kind: Kind.SELECTION_SET,
            selections: [field],
          },
          p.verbose,
          [],
          root.properties["query"],
        ).map((stage) => {
          // disable rate limiting for introspection
          stage.props.rateWeight = 0;
          return stage;
        }),
      ];
      // console.log({
      //   stages: stages.map((s) => s.props.path.join("/")).join(", "),
      // });
      return stages;
    }

    // typename case
    if (name === "__typename") {
      if (args && args.length > 0) {
        throw Error(`__typename cannot have args ${JSON.stringify(args)}`);
      }

      return [
        new ComputeStage({
          dependencies: [],
          parent: p.parentStage,
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
          node: name,
          path: [...path, alias ?? name],
          rateCalls: true,
          rateWeight: 0,
        }),
      ];
    }

    const fieldIdx = parentProps[name];
    if (fieldIdx == undefined) {
      throw Error(
        `${name} not found at ${formatPath(path)}, available names are: ${
          Object.keys(parentProps).join(", ")
        }`,
      );
    }
    const fieldType = this.type(fieldIdx);
    const checksField = fieldType.policies.map((p) => this.policy(p).name);
    if (checksField.length > 0) {
      policies[fieldType.title] = checksField;
    }

    if (!isFunction(fieldType)) {
      return this.traverseValueField({
        field,
        schema: fieldType,
        idx: fieldIdx,
        traverseParams: p,
        policies,
      });
    }

    // function case
    return this.traverseFuncField({
      field,
      schema: fieldType,
      idx: fieldIdx,
      traverseParams: p,
      policies,
      parentProps,
    });
  }

  traverseValueField(
    { field, schema, idx, traverseParams: p, policies }: {
      field: FieldNode;
      schema: TypeNode;
      idx: number;
      traverseParams: TraverseParams;
      policies: Record<string, string[]>;
    },
  ): ComputeStage[] {
    const {
      name: { value: name },
      alias: { value: alias } = {},
      arguments: args = TypeGraph.emptyArgs,
      selectionSet: fields = TypeGraph.emptyFields,
    } = field;
    const path = [...(p.queryPath ?? []), alias ?? name];
    const stages = [];

    if (args.length > 0) {
      throw Error(
        `unexpected args ${JSON.stringify(args)} at ${path.join(".")}`,
      );
    }

    const runtime = this.runtimeReferences[schema.runtime];

    const stage = new ComputeStage({
      dependencies: p.parentStage ? [p.parentStage.id()] : [],
      parent: p.parentStage,
      args: {},
      policies,
      outType: schema,
      runtime,
      batcher: this.nextBatcher(schema),
      node: name,
      path,
      rateCalls: true,
      rateWeight: 0,
    });

    stages.push(stage);

    if (isObject(schema)) {
      stages.push(...this.traverse(
        p.fragments,
        name,
        args,
        fields,
        p.verbose,
        path,
        idx,
        stage,
      ));
      return stages;
    }

    if (isOptional(schema)) {
      const itemTypeIdx = schema.item;
      const itemSchema = this.type(itemTypeIdx);
      if (isArray(itemSchema)) {
        const arrayItemTypeIdx = itemSchema.items;
        const arrayItemSchema = this.type(arrayItemTypeIdx);

        if (isString(arrayItemSchema)) {
          stages.push(
            ...this.traverse(
              p.fragments,
              name,
              args,
              fields,
              p.verbose,
              path,
              arrayItemTypeIdx,
              stage,
            ),
          );
        }

        return stages;
      }
    }

    if (isQuantifier(schema)) {
      const itemTypeIdx = getWrappedType(schema);
      const itemSchema = this.type(itemTypeIdx);

      if (isObject(itemSchema)) {
        stages.push(
          ...this.traverse(
            p.fragments,
            name,
            args,
            fields,
            p.verbose,
            path,
            itemTypeIdx,
            stage,
          ),
        );
      }

      return stages;
    }

    return stages;
  }

  traverseFuncField(
    { field, schema, traverseParams: p, policies, parentProps }: {
      field: FieldNode;
      schema: FunctionNode;
      idx: number;
      traverseParams: TraverseParams;
      policies: Record<string, string[]>;
      parentProps: Record<string, number>;
    },
  ): ComputeStage[] {
    const {
      name: { value: name },
      alias: { value: alias } = {},
      arguments: fieldArgs = TypeGraph.emptyArgs,
      selectionSet: fields = TypeGraph.emptyFields,
    } = field;
    const path = p.queryPath ?? [];

    const stages = [] as ComputeStage[];
    const deps = [];
    if (p.parentStage) {
      deps.push(p.parentStage.id());
    }

    const { input: inputIdx, output: outputIdx, rate_calls, rate_weight } =
      schema;
    const outputType = this.type(outputIdx);

    const checks = outputType.policies.map((p) => this.policy(p).name);
    if (checks.length > 0) {
      policies[outputType.title] = checks;
    }
    const args: Record<string, ComputeArg> = {};

    const argSchema = this.type(inputIdx) as ObjectNode;
    const fieldArgsIdx: Record<string, ast.ArgumentNode> = (
      fieldArgs ?? []
    ).reduce(
      (agg, fieldArg) => ({ ...agg, [fieldArg.name.value]: fieldArg }),
      {},
    );

    const nestedDepsUnion = [];
    for (
      const [argName, argIdx] of Object.entries(argSchema.properties ?? {})
    ) {
      const nested = this.collectArg(
        fieldArgsIdx[argName],
        argIdx,
        parentProps,
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

    deps.push(
      ...Array.from(new Set(nestedDepsUnion)).map((dep) =>
        [...path, dep].join(".")
      ),
    );

    const mat = this.tg.materializers[schema.materializer];
    const runtime = this.runtimeReferences[mat.runtime];

    if (!p.serial && mat.data.serial) {
      throw Error(
        `${schema.title} via ${mat.name} can only be executed in mutation`,
      );
    }

    const stage = new ComputeStage({
      dependencies: deps,
      parent: p.parentStage,
      args,
      policies,
      outType: outputType,
      runtime,
      materializer: mat,
      batcher: this.nextBatcher(outputType),
      node: name,
      path: [...path, alias ?? name],
      rateCalls: rate_calls,
      rateWeight: rate_weight as number, // FIXME what is the right type?
    });
    stages.push(stage);

    if (isObject(outputType)) {
      stages.push(
        ...this.traverse(
          p.fragments,
          name,
          fieldArgs,
          fields,
          p.verbose,
          [...path, name ?? alias],
          outputIdx,
          stage,
        ),
      );
    } else if (
      isOptional(outputType) &&
      isArray(this.type(outputType.item))
    ) {
      const subTypeIdx = outputType.item;
      const subType = this.type(subTypeIdx) as ArrayNode;
      const subSubTypeIdx = subType.items;
      const subSubType = this.type(subSubTypeIdx);

      if (isObject(subSubType)) {
        stages.push(
          ...this.traverse(
            p.fragments,
            name,
            fieldArgs,
            fields,
            p.verbose,
            [...path, alias ?? name], // FIXME
            subSubTypeIdx,
            stage,
          ),
        );
      }
    } else if (
      isQuantifier(outputType)
    ) {
      const subTypeIdx = getWrappedType(outputType);
      const subType = this.type(subTypeIdx);
      if (isObject(subType)) {
        stages.push(
          ...this.traverse(
            p.fragments,
            name,
            fieldArgs,
            fields,
            p.verbose,
            [...path, alias ?? name], // FIXME
            subTypeIdx,
            stage,
          ),
        );
      }
    }

    return stages;
  }

  traverse(
    fragments: FragmentDefs,
    parentName: string,
    parentArgs: readonly ast.ArgumentNode[],
    parentSelectionSet: ast.SelectionSetNode,
    verbose: boolean,
    queryPath: string[],
    parentIdx: number,
    parentStage: ComputeStage | undefined = undefined,
    serial = false,
  ): ComputeStage[] {
    const parentType = this.type(parentIdx) as ObjectNode;
    const stages: ComputeStage[] = [];

    const parentSelection = graphql.resolveSelection(
      parentSelectionSet,
      fragments,
    );
    const parentProps = (parentType.properties ?? {}) as Record<string, number>;
    verbose &&
      console.log(
        this.root.title,
        parentName,
        parentArgs.map((n) => n.name?.value),
        parentSelection.map((n) => n.name?.value),
        parentType.type,
        Object.entries(parentProps).reduce(
          (agg, [k, v]) => ({ ...agg, [k]: this.type(v).type }),
          {},
        ),
      );

    if (isObject(parentType) && parentSelection.length < 1) {
      throw Error(`struct "${parentName}" must a field selection`);
    }

    for (const field of parentSelection) {
      stages.push(...this.traverseField({
        field,
        traverseParams: {
          fragments,
          parentName,
          parentArgs,
          parentSelectionSet,
          verbose,
          queryPath,
          parentIdx,
          parentStage,
          serial,
        },
        parentProps,
      }));
    }

    return stages;
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
          const mat = this.introspection.tg.materializers[
            introPolicy.materializer as number
          ];
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

      const mat = this.tg.materializers[policy.materializer as number];
      const rt = this.runtimeReferences[mat.runtime] as DenoRuntime;
      ensure(
        rt.constructor === DenoRuntime,
        "runtime for policy must be a DenoRuntime",
      );
      return [policy.name, rt.delegate(mat, false)] as [string, Resolver];
    });

    return (context: Record<string, any>) => {
      const ret: PolicyStages = {};
      for (const [policyName, resolver] of policies) {
        // for policies, the context becomes the args
        ret[policyName] = async () =>
          await lazyResolver<boolean | null>(resolver)({
            ...context,
            _: {
              parent: {},
              context: {},
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
