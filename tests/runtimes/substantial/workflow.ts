import {
  Context,
  queryThatTakesAWhile,
  sendSubscriptionEmail,
  sleep,
} from "./imports/common_types.ts";

export async function eventsAndExceptionExample(ctx: Context) {
  const { to } = ctx.kwargs;
  const messageDialog = await ctx.save(() => sendSubscriptionEmail(to));

  // This will wait until a `confirmation` event is sent to THIS workflow
  const confirmation = ctx.receive<boolean>("confirmation");

  if (!confirmation) {
    throw new Error(`${to} has denied the subscription`);
  }

  return `${messageDialog}: confirmed!`;
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
  const { fail, timeout } = ctx.kwargs;
  const retryRet = await ctx.save(
    () => {
      if (fail) {
        throw new Error(`Failed successfully`);
      }

      return "No fail";
    },
    {
      retry: {
        strategy: "linear",
        minBackoffMs: 1000,
        maxBackoffMs: 5000,
        maxRetries: 4,
      },
    }
  );

  const timeoutRet = await ctx.save(
    async () => {
      if (timeout) {
        await sleep(500);
      }

      return "No timeout";
    },
    {
      timeoutMs: 200,
      retry: {
        strategy: "linear",
        minBackoffMs: 1000,
        maxBackoffMs: 3000,
        maxRetries: 5,
      },
    }
  );

  return [timeoutRet, retryRet].join(", ");
}
