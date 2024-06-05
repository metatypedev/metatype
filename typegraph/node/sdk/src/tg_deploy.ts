// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import {
  FinalizeParams,
  MigrationAction,
} from "./gen/interfaces/metatype-typegraph-core.js";
import { ArtifactUploader } from "./tg_artifact_upload.js";
import { TypegraphOutput } from "./typegraph.js";
import { wit_utils } from "./wit.js";
import { execRequest } from "./utils/func_utils.js";

export class BasicAuth {
  constructor(
    public username: string,
    public password: string,
  ) {}
  asHeaderValue(): string {
    return `Basic ${btoa(this.username + ":" + this.password)}`;
  }
}

export interface TypegateConnectionOptions {
  url: string;
  auth?: BasicAuth;
}

export interface TypegraphDeployParams {
  typegate: TypegateConnectionOptions;
  typegraphPath: string;
  prefix?: string;
  secrets?: Record<string, string>;
  migrationsDir?: string;
  migrationActions?: Record<string, MigrationAction>;
  defaultMigrationAction?: MigrationAction;
}

export interface TypegraphRemoveParams {
  typegate: TypegateConnectionOptions;
}

export interface DeployResult {
  serialized: string;
  response: Record<string, any>;
}

export interface RemoveResult {
  typegate: Record<string, any> | string;
}

export interface ArtifactMeta {
  typegraphName: string;
  relativePath: string;
  hash: string;
  sizeInBytes: number;
}

export async function tgDeploy(
  typegraph: TypegraphOutput,
  params: TypegraphDeployParams,
): Promise<DeployResult> {
  const serializeParams = {
    typegraphPath: params.typegraphPath,
    prefix: params.prefix,
    artifactResolution: true,
    codegen: false,
    prismaMigration: {
      migrationsDir: params.migrationsDir ?? "prisma-migrations",
      migrationActions: Object.entries(params.migrationActions ?? {}),
      defaultMigrationAction: params.defaultMigrationAction ?? {
        apply: true,
        create: false,
        reset: false,
      },
    },
  } satisfies FinalizeParams;
  const serialized = typegraph.serialize(serializeParams);
  const tgJson = serialized.tgJson;
  const refArtifacts = serialized.ref_artifacts;

  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  const typegate = params.typegate;
  if (typegate.auth) {
    headers.append("Authorization", typegate.auth.asHeaderValue());
  }

  if (refArtifacts.length > 0) {
    // upload the artifacts
    const artifactUploader = new ArtifactUploader(
      params.typegate.url,
      refArtifacts,
      typegraph.name,
      typegate.auth,
      headers,
      params.typegraphPath,
    );
    await artifactUploader.uploadArtifacts();
  }

  // deploy the typegraph
  const response = await execRequest(
    new URL("/typegate", typegate.url),
    {
      method: "POST",
      headers,
      body: wit_utils.gqlDeployQuery({
        tg: tgJson,
        secrets: Object.entries(params.secrets ?? {}),
      }),
    },
    `tgDeploy failed to deploy typegraph ${typegraph.name}`,
  );

  if (response.errors) {
    for (const err of response.errors) {
      console.error(err.message);
    }
    throw new Error(`failed to deploy typegraph ${typegraph.name}`);
  }

  return {
    serialized: tgJson,
    response: response.data.addTypegraph,
  };
}

export async function tgRemove(
  typegraph: TypegraphOutput,
  params: TypegraphRemoveParams,
): Promise<RemoveResult> {
  const { url, auth } = params.typegate;

  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  if (auth) {
    headers.append("Authorization", auth.asHeaderValue());
  }

  const response = await execRequest(
    new URL("/typegate", url),
    {
      method: "POST",
      headers,
      body: wit_utils.gqlRemoveQuery([typegraph.name]),
    },
    `tgRemove failed to remove typegraph ${typegraph.name}`,
  );

  return { typegate: response };
}
