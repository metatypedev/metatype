interface Context {
  kwargs: any;
  sleep: (ms: number) => void;
  save<T>(fn: () => Promise<T>);
}

function sleep(duration: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, duration);
  });
}

async function queryThatTakesAWhile(a: number) {
  let s = 0;
  for (let i = 0; i < a; i++, s += i);
  await sleep(2000);
  return s;
}

export async function example(ctx: Context) {
  const { a, b } = ctx.kwargs;
  // 2s
  const rangeA = await ctx.save(() => queryThatTakesAWhile(a as number));
  // 4s
  const rangeB = await ctx.save(() => queryThatTakesAWhile(b as number));

  console.log("sleeping...");
  ctx.sleep(10000);
  console.log("stopped sleeping...");
  // 14s
  return rangeA + rangeB;
}

export function sayHello(ctx: any) {
  return ctx.save(() => "Hello World");
}
