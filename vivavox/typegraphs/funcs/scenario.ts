import { RootPublishScenarioFnHandler } from "./fdk.ts";
import Sqids from "npm:sqids@0.3.0";
import { initClient } from "./utils.ts";

const sqids = new Sqids();

export const publishScenario: RootPublishScenarioFnHandler = async (
  inp,
  cx,
) => {
  const { qg, gql } = initClient(cx.meta.token);
  const { scenario } = await gql.query({
    // check if the scenario exists
    scenario: qg.findScenario(
      {
        where: { id: inp.scenarioId },
      },
      { id: true, publishedAt: true, links: { slug: true } },
    ),
  });
  if (!scenario) {
    throw new Error("scenario not found");
  }
  if (scenario.publishedAt) {
    return { scenarioId: inp.scenarioId, slug: scenario.links[0].slug };
  }

  const { sqidNo } = await gql.mutation({
    sqidNo: qg.getSqidNumber(
      {
        key: "default",
        key_again: "default",
      },
      { number: true },
    ),
  });

  const sqidInput = [sqidNo.number, Math.floor(Math.random() * 100_000)];
  const slug = sqids.encode(sqidInput);
  const slugRecipe = {
    method: "sqid",
    input: sqidInput,
    output: slug,
  };

  const { updatedScenario } = await gql.mutation({
    updatedScenario: qg.updateScenarioInternal(
      {
        where: { id: inp.scenarioId },
        data: {
          publishedAt: new Date().toJSON(),
          updatedAt: new Date().toJSON(),
          links: {
            create: {
              slug,
              slugRecipe: JSON.stringify(slugRecipe),
              createdAt: new Date().toJSON(),
              updatedAt: new Date().toJSON(),
            },
          },
        },
      },
      { id: true, publishedAt: true, links: { slug: true } },
    ),
  });

  return { scenarioId: inp.scenarioId, slug: updatedScenario.links[0].slug };
};
