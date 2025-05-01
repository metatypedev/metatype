import { Ctx } from "./fdk.ts";
import { initClient } from "./utils.ts";

export const makeProfiler = async (params: { sub: string }, ctx: Ctx) => {
  const { qg, gql } = initClient(ctx.meta.token);

  const { user } = await gql.query({
    user: qg.findUser(
      {
        where: { providerId: params.sub },
      },
      { id: true, email: true },
    ),
  });

  return { id: user?.id, email: user?.email };
};
