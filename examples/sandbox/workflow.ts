interface Context {
  kwargs: any;
  save<T>(fn: () => Promise<T>);
}

function sleep(duration: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, duration);
  });
}

async function rangeSum(a: number) {
  let s = 0;
  for (let i = 0; i < a; i++, s += i);
  return s;
}

export async function example(ctx: Context) {
  const { a, b } = ctx.kwargs;
  const rangeA = await ctx.save(() => rangeSum(a as number));
  await sleep(5000);
  const rangeB = await ctx.save(() => rangeSum(b as number));
  return rangeA + rangeB;
}

export function sayHello(ctx: any) {
  return ctx.save(() => "Hello World");
}
