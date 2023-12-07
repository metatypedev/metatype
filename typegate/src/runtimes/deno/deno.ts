// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { ComputeStage } from "../../engine/query_engine.ts";
import { TypeGraphDS, TypeMaterializer } from "../../typegraph/mod.ts";
import { Runtime } from "../Runtime.ts";
import { Resolver, RuntimeInitParams } from "../../types.ts";
import { DenoRuntimeData } from "../../typegraph/types.ts";
import * as ast from "graphql/ast";
import { InternalAuth } from "../../services/auth/protocols/internal.ts";
import { DenoMessenger } from "./deno_messenger.ts";
import { Task } from "./shared_types.ts";
import { structureRepr, uncompress } from "../../utils.ts";
import { path } from "compress/deps.ts";
import config from "../../config.ts";
import { getLogger } from "../../log.ts";

const logger = getLogger(import.meta);

const predefinedFuncs: Record<string, Resolver<Record<string, unknown>>> = {
  identity: ({ _, ...args }) => args,
  true: () => true,
  false: () => false,
};

export class DenoRuntime extends Runtime {
  private constructor(
    private typegraphName: string,
    uuid: string,
    private tg: TypeGraphDS,
    private w: DenoMessenger,
    private registry: Map<string, number>,
    private secrets: Record<string, string>,
  ) {
    super(typegraphName, uuid);
  }

  static async init(
    params: RuntimeInitParams,
  ): Promise<Runtime> {
    const { typegraph: tg, typegraphName, args, materializers, secretManager } =
      params as RuntimeInitParams<DenoRuntimeData>;

    const { worker: name } = args as unknown as DenoRuntimeData;
    if (name == null) {
      throw new Error(
        `Cannot create deno runtime: worker name required, got ${name}`,
      );
    }

    const secrets: Record<string, string> = {};
    for (const m of materializers) {
      for (const secretName of m.data.secrets as [] ?? []) {
        secrets[secretName] = secretManager.secretOrFail(secretName);
      }
    }

    const registry = new Map<string, number>();
    const ops = new Map<number, Task>();

    const uuid = crypto.randomUUID();
    //    (user) tg_root/*
    // => (gate) tmp/scripts/{tgname}/deno/*
    const basePath = path.join(
      config.tmp_dir,
      "scripts",
      typegraphName,
      uuid,
      "deno",
      name.replaceAll(" ", "_"), // TODO: improve sanitization
    );

    try {
      // clean up old files
      // logger.debug(`removes files at ${basePath}`);
      await Deno.remove(basePath, { recursive: true });
    } catch {
      // ignore non-existent files
    }

    let registryCount = 0;
    for (const mat of materializers) {
      if (mat.name === "function") {
        const code = mat.data.script as string;

        ops.set(registryCount, {
          type: "register_func",
          fnCode: code,
          op: registryCount,
          verbose: false,
        });
        registry.set(code, registryCount);
        registryCount += 1;
      } else if (mat.name === "module") {
        const code = mat.data.code as string;

        const repr = await structureRepr(code);
        const outDir = path.join(basePath, repr.hashes.entryPoint);
        const entries = await uncompress(
          outDir,
          repr.base64,
        );

        logger.info(`uncompressed ${entries.join(", ")} at ${outDir}`);
        // Note:
        // Worker destruction seems to have no effect on the import cache? (deinit() => stop(worker))
        // hence the use of contentHash
        ops.set(registryCount, {
          type: "register_import_func",
          modulePath: path.join(
            outDir,
            `${repr.entryPoint}?hash=${repr.hashes.content}`,
          ),
          op: registryCount,
          verbose: false,
        });
        registry.set(code, registryCount);
        registryCount += 1;
      }
    }

    const w = new DenoMessenger(
      name,
      {
        ...(args.permissions ?? {}),
        read: [basePath],
      } as Deno.PermissionOptionsObject,
      false,
      ops,
    );

    if (Deno.env.get("DENO_TESTING") === "true") {
      await w.disableLazyness();
    }

    const rt = new DenoRuntime(
      typegraphName,
      uuid,
      tg,
      w,
      registry,
      secrets,
    );

    return rt;
  }

  async deinit(): Promise<void> {
    await this.w.terminate();
  }

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    verbose: boolean,
  ): ComputeStage[] {
    if (stage.props.node === "__typename") {
      return [stage.withResolver(() => {
        const { parent: parentStage } = stage.props;
        if (parentStage != null) {
          return parentStage.props.outType.title;
        }
        switch (stage.props.operationType) {
          case ast.OperationTypeNode.QUERY:
            return "Query";
          case ast.OperationTypeNode.MUTATION:
            return "Mutation";
          default:
            throw new Error(
              `Unsupported operation type '${stage.props.operationType}'`,
            );
        }
      })];
    }

    if (stage.props.materializer != null) {
      return [
        stage.withResolver(this.delegate(stage.props.materializer, verbose)),
      ];
    }

    if (stage.props.outType.config?.__namespace) {
      return [stage.withResolver(() => ({}))];
    }

    return [stage.withResolver(({ _: { parent } }) => {
      if (stage.props.parent == null) { // namespace
        return {};
      }
      const resolver = parent[stage.props.node];
      return typeof resolver === "function" ? resolver() : resolver;
    })];
  }

  delegate(
    mat: TypeMaterializer,
    verbose: boolean,
    pulseCount?: number,
  ): Resolver {
    if (mat.name === "predefined_function") {
      const func = predefinedFuncs[mat.data.name as string];
      if (!func) {
        throw new Error(`predefined function ${mat.data.name} not found`);
      }
      return func;
    }

    if (mat.name === "static") {
      return () => mat.data.value;
    }

    const secrets = (mat.data.secrets as [] ?? []).reduce(
      (agg, secretName) => ({ ...agg, [secretName]: this.secrets[secretName] }),
      {},
    );

    if (mat.name === "import_function") {
      const modMat = this.tg.materializers[mat.data.mod as number];
      const op = this.registry.get(modMat.data.code as string)!;
      return async (
        { _: { context, parent, info: { url, headers } }, ...args },
      ) => {
        const token = await InternalAuth.emit();

        return this.w.execute(
          op,
          {
            type: "import_func",
            args,
            internals: {
              parent,
              context,
              secrets,
              effect: mat.effect.effect ?? null,
              meta: {
                url: `${url.protocol}//${url.host}/${this.typegraphName}`,
                token,
              },
              headers,
            },
            name: mat.data.name as string,
            verbose,
          },
          [],
          pulseCount,
        );
      };
    }

    if (mat.name === "function") {
      const op = this.registry.get(mat.data.script as string)!;
      return async (
        { _: { context, parent, info: { url, headers } }, ...args },
      ) => {
        const token = await InternalAuth.emit();

        return this.w.execute(
          op,
          {
            type: "func",
            args,
            internals: {
              parent,
              context,
              secrets,
              effect: mat.effect.effect ?? null,
              meta: {
                url: `${url.protocol}//${url.host}/${this.typegraphName}`,
                token,
              },
              headers,
            },
            verbose,
          },
          [],
          pulseCount,
        );
      };
    }

    throw new Error(`unsupported materializer ${mat.name}`);
  }
}
