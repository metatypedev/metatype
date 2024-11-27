import type { Ctx, Idv3, RemixTrackHandler } from "./fdk.ts";

// the name of the export must match the one referred int he typegraph
export const remix_track: RemixTrackHandler = (inp, cx: Ctx) => {
  const out: Idv3 = {
    title: `${inp.title} (Remix)`,
    artist: `${inp.artist} + DJ Cloud`,
    releaseTime: new Date().toISOString(),
    // S3Runtime could be used to really provide this service
    mp3Url: `${cx.meta.url}/get_mp3`,
  };
  return out;
};
