export interface Context {
  // TODO: metagen including this
  kwargs: any;
  sleep: (ms: number) => void;
  save<T>(fn: () => Promise<T>): Promise<T>;
  receive<O>(eventName: string): O;
  handle<I, O>(
    eventName: string,
    fn: (received: I) => O | Promise<O>
  ): Promise<O>;
  ensure(conditionFn: () => boolean | Promise<boolean>): Promise<boolean>;
}

export async function queryThatTakesAWhile(input: number) {
  await sleep(2000);
  return input;
}

export function sleep(duration: number) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}
