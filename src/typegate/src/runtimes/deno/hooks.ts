import { getLogger } from "../../log.ts";
import { PushFailure, PushHandler } from "../../typegate/hooks.ts";
import { createArtifactMeta } from "../utils/deno.ts";

const logger = getLogger("typegate");

export class DenoFailure extends Error {
  failure: PushFailure;

  constructor(message: string) {
    super(message);
    this.failure = { reason: "DenoImportError", message };
  }
}

export const cacheModules: PushHandler = async (
  typegraph,
  _secretManager,
  _response,
  artifactStore,
) => {
  const { title } = typegraph.types[0];
  const { artifacts } = typegraph.meta;

  for (const mat of typegraph.materializers) {
    if (mat.name === "module") {
      const matData = mat.data;
      const entryPoint = artifacts[matData.entryPoint as string];
      const moduleMeta = createArtifactMeta(title, entryPoint);
      const depMetas = (matData.deps as string[]).map((dep) =>
        createArtifactMeta(title, artifacts[dep]),
      );
      const entryModulePath = await artifactStore.getLocalPath(
        moduleMeta,
        depMetas,
      );

      try {
        logger.info(`Caching deno imports for ${title} (${entryPoint.path})`);
        await import(entryModulePath);
      } catch (error) {
        console.error(error.stack);

        throw new DenoFailure(
          `An error occured when trying to import '${entryPoint.path}'`,
        );
      }
    }
  }

  return typegraph;
};
