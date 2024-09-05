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
  await sleep(100);
  return s;
}

export async function example(ctx: Context) {
  const { a, b } = ctx.kwargs;
  const rangeA = await ctx.save(() => queryThatTakesAWhile(a as number));
  const rangeB = await ctx.save(() => queryThatTakesAWhile(b as number));

  console.log("sleeping...");
  ctx.sleep(10000);
  console.log("stopped sleeping...");

  return rangeA + rangeB;
}

export function sayHello(ctx: any) {
  return ctx.save(() => "Hello World");
}
