// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { getLogger } from "../../../log.ts";
import { PushFailure, PushHandler } from "../../../typegate/hooks.ts";
import { createArtifactMeta } from "../../utils/deno.ts";

const logger = getLogger("typegate");

export class ValidationFailure extends Error {
  failure: PushFailure;

  constructor(message: string) {
    super(message);
    this.failure = { reason: "ValidationError", message };
  }
}

export const codeValidations: PushHandler = async (
  typegraph,
  _secretManager,
  _response,
  artifactStore,
) => {
  const { title } = typegraph.types[0];
  const { artifacts } = typegraph.meta;

  for (const mat of typegraph.materializers) {
    if (mat.name === "import_function") {
      const pyModMat = typegraph.materializers[mat.data.mod as number];
      const entryPoint = artifacts[pyModMat.data.entryPoint as string];
      const moduleMeta = createArtifactMeta(title, entryPoint);
      const depMetas = (pyModMat.data.deps as string[]).map((dep) =>
        createArtifactMeta(title, artifacts[dep])
      );
      const entryModulePath = await artifactStore.getLocalPath(
        moduleMeta,
        depMetas,
      );

      try {
        logger.info(
          `Validating Python code at entry point: ${entryPoint.path}`,
        );
        Meta.py_validation.validate(entryModulePath);

        for (const dep of depMetas) {
          const depsPath = await artifactStore.getLocalPath(dep);
          logger.info(`Validating Python code for dependency: ${dep.path}`);
          Meta.py_validation.validate(depsPath);
        }

        logger.info(
          `Successfully validated Python code at entry point: ${entryPoint.path}`,
        );
      } catch (err) {
        console.error({ err });
        throw new ValidationFailure(
          `Python code validation error at entry point '${entryPoint.path}': ${err.message}`,
        );
      }
    }
  }

  return typegraph;
};
