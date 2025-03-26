// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { getLogger } from "../../../log.ts";
import { PushFailure, PushHandler } from "../../../typegate/hooks.ts";
import { createArtifactMeta } from "../../utils/deno.ts";
import * as path from "@std/path";

const logger = getLogger("typegate");

export class DenoFailure extends Error {
  failure: PushFailure;

  constructor(message: string) {
    super(message);
    this.failure = { reason: "DenoImportError", message };
  }
}

function sandboxImport(modulePath: string, readRootPath: string) {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(new URL("./worker.ts", import.meta.url).href, {
      type: "module",
      deno: {
        permissions: {
          import: true,
          read: [readRootPath],
          run: false,
          write: false,
          ffi: false,
        },
      },
    });

    worker.postMessage({ import: modulePath });

    worker.onmessage = ({ data }: MessageEvent<{ error?: any }>) => {
      if (data.error) {
        reject(data.error);
      } else {
        resolve();
      }
    };

    worker.onerror = (error) => {
      reject(error);
    };
  });
}

export const cacheModules: PushHandler = async (
  typegraph,
  _secretManager,
  _response,
  artifactStore,
  typegate,
) => {
  const { title } = typegraph.types[0];
  const { artifacts } = typegraph.meta;

  const basePath = path.join(typegate.config.base.tmp_dir, "artifacts");
  for (const mat of typegraph.materializers) {
    if (mat.name === "module") {
      const matData = mat.data;
      const entryPoint = artifacts[matData.entryPoint as string];
      const moduleMeta = createArtifactMeta(title, entryPoint);
      const depMetas = (matData.deps as string[]).map((dep) =>
        createArtifactMeta(title, artifacts[dep])
      );
      const entryModulePath = await artifactStore.getLocalPath(
        moduleMeta,
        depMetas,
      );

      try {
        logger.info(`Caching deno imports for ${title} (${entryPoint.path})`);
        await sandboxImport(entryModulePath, basePath);
        logger.info(`'${entryPoint.path}' was cached`);
      } catch (error: any) {
        console.error(error.stack);

        throw new DenoFailure(
          `An error occured when trying to import '${entryPoint.path}'`,
        );
      }
    }
  }

  return typegraph;
};
