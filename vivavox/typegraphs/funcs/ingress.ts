import process from "node:process";
// bullmq attempts to read all env vars which require
// full Deno env permission. We replace the env object
// to avoid the error
process.env = {};

import { Workflow } from "./types.ts";
import * as viva from "./fdk.ts";
import { assertStringField, initClient, tgUrl } from "./utils.ts";
const {
  IngressClient,
  IngressInput,
  // TODO: sync versions with package.json
  // FIXME: add the empty strign as a workaround for https://www.reddit.com/r/Deno/comments/1admz5e/why_am_i_getting_typeerror_loading_unprepared/
} = await import("npm:livekit-server-sdk@2.7.2");
const { Queue } = await import("npm:bullmq@5.26.2");

/**
 * This workflow starts a new ingress and deletes it when
 * it detects that the interviwee has stopped watching.
 * The actual listening for livekit events happens in a dedicated
 * worker process which recieves a job through bullmq queue.
 *
 * Note that livekit gives a 20 second grace time before
 * emitting the disconnected event for watchers so the
 * ingress will go on an extra 20 seconds after closing
 * the tab for example.
 */
export const startIngress: Workflow<{}> = async (ctx, { meta, secrets }) => {
  const inp = ctx.kwargs as viva.RootStartIngressFnInputKwargsStruct;
  
  // [ "run", "gql", "id", "kwargs", "logger" ]
  // console.log(Object.keys(ctx));
  // [ "parent", "context", "secrets", "effect", "meta", "headers" ]
  // console.log(Object.keys(ctx2));

  const livekitHost = assertStringField(secrets, "LIVEKIT_HOST");
  const livekitKey = assertStringField(secrets, "LIVEKIT_KEY");
  const livekitSecret = assertStringField(secrets, "LIVEKIT_SECRET");
  const workerRedisUrl = assertStringField(secrets, "WORKER_REDIS_URL");

  const { qg, gql } = initClient(meta.token);

  const { objectUrl } = await ctx.save(async () => {
    const res = await gql.query({
      objectUrl: qg.getDownloadUrl({
        path: inp.fileName,
      }),
    });
    return res;
  });

  const ingressCient = new IngressClient(
    livekitHost,
    livekitKey,
    livekitSecret,
  );
  const ingressIdentity = "Interviewer";

  const ingressInfo = await ctx.save(async () => {
    const ingressInfo = await ingressCient.createIngress(
      IngressInput.URL_INPUT,
      {
        roomName: inp.roomName,
        name: `play-ingress-${inp.roomName}`,
        participantIdentity: ingressIdentity,
        participantName: "Interviewer",
        url: objectUrl,
        // url: `http://host.docker.internal:8000/questions/${inp.fileName}.webm`,
      },
    );
    return ingressInfo;
  });

  await ctx.save(async () => {
    const queue = new Queue("active_ingress", {
      connection: { url: workerRedisUrl },
      defaultJobOptions: { attempts: 10 },
    });
    await queue.add(`listen_and_kill_${ingressInfo.ingressId}`, {
      ingressId: ingressInfo.ingressId,
      roomName: inp.roomName,
    });
    console.log("ingress job added", ingressInfo);
  });

  return {};
};
