interface Context {
  // TODO: metagen including this
  kwargs: any;
  sleep: (ms: number) => void;
  save<T>(fn: () => Promise<T>);
  receive<O>(eventName: string): O;
  handle<I, O>(
    eventName: string,
    fn: (received: I) => O | Promise<O>
  ): Promise<O>;
  ensure(conditionFn: () => boolean | Promise<boolean>): Promise<boolean>;
}

function sleep(duration: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, duration);
  });
}

async function queryThatTakesAWhile(input: number) {
  // await sleep(4000);
  return input;
}

export async function example(ctx: Context) {
  const { a, b } = ctx.kwargs;
  const newA = await ctx.save(() => queryThatTakesAWhile(a as number));
  const newB = await ctx.save(() => queryThatTakesAWhile(b as number));
  const receivedC = ctx.receive("other") as string;

  ctx.sleep(1000);
  return newA + newB + receivedC.length;
}
