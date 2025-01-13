// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { MigrationAction, SerializeParams } from "./gen/core.ts";
import { ArtifactUploader } from "./tg_artifact_upload.ts";
import type { TypegraphOutput } from "./typegraph.ts";
import { sdkUtils } from "./sdk.ts";
import { execRequest } from "./utils/func_utils.ts";
import { log } from "./io.ts";

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
  // deno-lint-ignore no-explicit-any
  response: Record<string, any>;
}

export interface RemoveResult {
  // deno-lint-ignore no-explicit-any
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
    pretty: false,
  } satisfies SerializeParams;
  const serialized = typegraph.serialize(serializeParams);
  const tgJson = serialized.tgJson;
  const refArtifacts = serialized.ref_artifacts;

  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  const typegate = params.typegate;
  if (typegate.auth) {
    headers.append("Authorization", typegate.auth.asHeaderValue());
  }
  const url = new URL("/typegate", typegate.url);

  // Make sure we have the correct credentials before doing anything
  await pingTypegate(url, headers);

  if (refArtifacts.length > 0) {
    // upload the artifacts
    const artifactUploader = new ArtifactUploader(
      typegate.url,
      refArtifacts,
      typegraph.name,
      typegate.auth,
      headers,
      params.typegraphPath,
    );
    await artifactUploader.uploadArtifacts();
  } else {
    log.debug("no artifacts to upload");
  }

  // deploy the typegraph
  const response = (await execRequest(
    url,
    {
      method: "POST",
      headers,
      body: sdkUtils.gqlDeployQuery({
        tg: tgJson,
        secrets: Object.entries(params.secrets ?? {}),
      }),
    },
    `tgDeploy failed to deploy typegraph ${typegraph.name}`,
    // deno-lint-ignore no-explicit-any
  )) as Record<string, any>;

  if (response.errors) {
    for (const err of response.errors) {
      console.error(err.message);
    }
    throw new Error(`failed to deploy typegraph ${typegraph.name}`);
  }

  const addTypegraph = response.data.addTypegraph;

  /*
  // FIXME: failure field is used by interactive deployment
  // which means errors need to be ignored here but this
  // allows deployment errors in non-interactive scenarios
  if (addTypegraph.failure) {
    console.error(addTypegraph.failure);
    throw new Error(`failed to deploy typegraph ${typegraph.name}`);
  } */

  return {
    serialized: tgJson,
    response: addTypegraph,
  };
}

export async function tgRemove(
  typegraphName: string,
  params: TypegraphRemoveParams,
): Promise<RemoveResult> {
  const { url, auth } = params.typegate;

  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  if (auth) {
    headers.append("Authorization", auth.asHeaderValue());
  }

  const response = (await execRequest(
    new URL("/typegate", url),
    {
      method: "POST",
      headers,
      body: sdkUtils.gqlRemoveQuery([typegraphName.toString()]),
    },
    `tgRemove failed to remove typegraph ${typegraphName}`,
    // deno-lint-ignore no-explicit-any
  )) as Record<string, any> | string;

  return { typegate: response };
}

export async function pingTypegate(url: URL, headers: Headers) {
  await execRequest(
    url,
    {
      method: "POST",
      headers,
      body: sdkUtils.gqlPingQuery(),
    },
    "Failed to access typegate",
  );
}
