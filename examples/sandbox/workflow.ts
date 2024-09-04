interface Context {
  save<T>(fn: () => Promise<T>);
}

function heavyOp() {
  let sum = 0;
  for (let i = 0; i < 100; i++, sum += i);
  return sum;
}

function sleep(duration: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, duration);
  });
}

export async function example(ctx: Context) {
  const sum = 1 + (await ctx.save(async () => heavyOp()));
  const sum2 = 2 + (await ctx.save(async () => heavyOp()));
  console.log("WAITING");
  await sleep(10000);
  return sum + sum2;
}

export function sayHello(ctx: any) {
  return ctx.save(() => "Hello World");
}
