// This file was @generated by metagen and is intended
// to be generated again on subsequent metagen runs.

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

export type StringDateTime = string;
export type StringUri = string;
export type Idv3 = {
  title: string;
  artist: string;
  releaseTime: StringDateTime;
  mp3Url: StringUri;
};

export type RemixTrackHandler = Handler<Idv3, Idv3>;
