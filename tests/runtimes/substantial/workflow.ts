import { Context, queryThatTakesAWhile } from "./common_types.ts";

export async function saveAndSleep(ctx: Context) {
  const { a, b } = ctx.kwargs;
  const newA = await ctx.save(() => queryThatTakesAWhile(a as number));
  // + 2s
  const newB = await ctx.save(() => queryThatTakesAWhile(b as number));
  // + 2s

  // + ~5s (depending on the wait relaunch setting)
  ctx.sleep(5000);
  return newA + newB;
}
