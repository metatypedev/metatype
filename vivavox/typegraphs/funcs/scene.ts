import { CreateSceneHandler, CreateSceneOutput } from "./fdk.ts";
import { initClient } from "./utils.ts";

// const setSceneOrder = vivaGql.prepareMutation((args: PreparedArgs<{ sceneId: string, order: number }>) => ({
//   scene: vivaQg.setSceneOrderInternal(
//     {
//       sceneId: args.get("sceneId"),
//       order: args.get("order"),
//     },
//     {
//       id: true,
//     }
//   )
// })).doc;

export const createScene: CreateSceneHandler = async (
  { scenarioId, scene },
  cx,
) => {
  console.log(cx);
  const { qg, gql } = initClient(cx.meta.token);

  // TODO transaction

  const {
    aggregate: {
      _count: { _all: count },
    },
  } = await gql
    .query({
      aggregate: qg.aggregateScenesInternal(
        {
          scenarioId: scenarioId,
        },
        {
          _count: {
            _all: true,
          },
        },
      ),
    })
    .catch((err) => {
      console.log(err);
      throw err;
    });

  const res = await gql.mutation({
    scene: qg.createSceneInternal(
      {
        data: {
          title: scene.title,
          description: scene.description,
          order: count!,
          scenario: {
            connect: {
              id: scenarioId,
            },
          },
        },
      },
      {
        id: true,
      },
    ),
  });

  return {
    sceneId: res.scene.id,
  } as CreateSceneOutput;
};
