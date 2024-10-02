import {
  Context,
  queryThatTakesAWhile,
  sendSubscriptionEmail,
} from "./imports/common_types.ts";

export async function eventsAndExceptionExample(ctx: Context) {
  const { to } = ctx.kwargs;
  const messageDialog = await ctx.save(() => sendSubscriptionEmail(to));

  // This will wait until a `confirmation` event is sent to THIS workflow
  const confirmation = ctx.receive<boolean>("confirmation");

  if (!confirmation) {
    throw new Error(`${to} has denied the subscription`);
  }

  return `${messageDialog}: "confirmed!"`;
}

export async function saveAndSleepExample(ctx: Context) {
  const { a, b } = ctx.kwargs;
  const newA = await ctx.save(() => queryThatTakesAWhile(a as number));
  // + 2s
  const newB = await ctx.save(() => queryThatTakesAWhile(b as number));
  // + 2s

  // + ~5s (depending on the wait relaunch setting)
  ctx.sleep(5000);
  return newA + newB;
}

export async function retryExample(ctx: Context) {
  const { fail } = ctx.kwargs;
  const ret = await ctx.save(
    () => {
      if (fail) {
        throw new Error(`Failed successfully`);
      }
      return "All good";
    },
    {
      retry: {
        strategy: "linear",
        minBackoff: 1,
        maxBackoff: 5,
        maxRetries: 4,
      },
    }
  );

  return ret;
}
