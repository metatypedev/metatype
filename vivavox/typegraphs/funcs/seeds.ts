import { SeedTestHandler } from "./fdk.ts";
import { initClient } from "./utils.ts";

export const seedTest: SeedTestHandler = async (_inp, cx) => {
  const { qg, gql } = initClient(cx.meta.token);

  await gql.mutation({
    scenarios: qg.createScenariosInternal(
      {
        data: [
          {
            id: "s1234",
            title: "Exercie Scenario",
            body: "Scenarios can have descriptions given by their creator that'll greet takers. Basic text can do for now but we could add support for markup as well.",
            createdAt: new Date().toJSON(),
            updatedAt: new Date().toJSON(),
          } as any,
        ],
      },
      {
        count: true,
      },
    ),
  });
  return true;
};
