import * as MathLib from "https://deno.land/x/math@v1.1.0/mod.ts";

interface MinInput {
  numbers: Array<number>;
}

export function min({ numbers }: MinInput): number {
  return Number(MathLib.min(numbers));
}
