import { Workflow } from "./types.ts";
import * as viva from "./fdk.ts";
import { initClient } from "./utils.ts";

export const responseSession: Workflow<{}> = async (ctx,) => {
  const inp = ctx.kwargs as viva.RootStartResponseSessionFnInputKwargsStruct;

  const { qg, gql } = initClient(ctx.internal.meta.token);
  const { session } = await ctx.save(() =>
    gql.query({
      session: qg.findVivaSession(
        { where: { id: inp.sessionId } },
        {
          expiresAtTs: true,
          sourceScenarioLink: {
            closedAt: true,
            scenario: {
              id: true,
              scenes: {
                id: true,
              },
            },
          },
        },
      ),
    }),
  );

  if (!session) {
    throw new Error("session not found");
  }

  // save the session expiry check to avoid failure on
  // a session that expires midway through recording
  const isExpired = await ctx.save(
    () =>
      session.expiresAtTs < new Date().getTime() / 1000 ||
      !!session.sourceScenarioLink.closedAt,
  );

  if (isExpired) {
    throw new Error("session is expired");
  }

  const startedAtRaw = await ctx.save(() => new Date().toJSON());

  const startedAt = new Date(startedAtRaw).getTime();
  const now = new Date().getTime();
  const elapsedSec = (now - startedAt) / 1000;

  if (inp.timeoutSec && elapsedSec > inp.timeoutSec) {
    throw new Error(`response session has timed out`);
  }

  const answers = {} as Record<
    string,
    viva.RootSendAnswerFnInputEventStructPayloadStruct
  >;

  const remainingScenes = new Set(
    session.sourceScenarioLink.scenario.scenes.map((scene) => scene.id),
  );
  while (remainingScenes.size > 0) {
    const answer =
      ctx.receive<viva.RootSendAnswerFnInputEventStructPayloadStruct>("answer");
    answers[answer.sceneId] = answer;
    remainingScenes.delete(answer.sceneId);
    console.log({ answer, answers, remainingScenes });
  }

  const submitResponse =
    ctx.receive<viva.RootSubmitResponseFnInputEventStruct["payload"]>(
      "submitResponse",
    );

  if (submitResponse) {
    const createdAt = new Date().toJSON();
    const updatedAt = createdAt;

    await ctx.save(() =>
      gql.mutation({
        response: qg.createResponseInternal(
          {
            data: {
              session: { connect: { id: inp.sessionId } },
              createdAt,
              updatedAt,

              videos: {
                createMany: {
                  data: Object.entries(answers).map(([_, answer]) => ({
                    scene: {
                      connect: {
                        id: answer.sceneId,
                      },
                    },
                    transcript: {
                      connect: {
                        id: answer.transcriptId,
                      },
                    },
                    filePath: answer.filePath,
                    recordingStartedAt: answer.recordingStartedAt,
                    createdAt,
                    updatedAt,
                  })),
                },
              },
            },
          },
          {
            id: true,
          },
        ),
      }),
    );
  }

  return {};
};
