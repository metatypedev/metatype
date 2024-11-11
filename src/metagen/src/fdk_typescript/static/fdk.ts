// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

export type Ctx = {
  parent?: Record<string, unknown>;
  /**
   * Request context extracted by auth extractors.
   */
  context?: Record<string, unknown>;
  secrets: Record<string, string>;
  effect: "create" | "update" | "delete" | "read" | undefined | null;
  meta: {
    url: string;
    token: string;
  };
  headers: Record<string, string>;
};

/**
 * Access features on your typegraph deployment.
 */
export type Deployment = {
  gql: (query: readonly string[], ...args: unknown[]) => {
    run: (
      variables: Record<string, unknown>,
    ) => Promise<Record<string, unknown>>;
  };
};

export type Handler<In, Out> = (
  input: In,
  ctx: Ctx,
  tg: Deployment,
) => Out | Promise<Out>;
