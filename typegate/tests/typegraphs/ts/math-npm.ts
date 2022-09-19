import * as MathJS from "npm:mathjs";

interface LogInput {
  base: null | number;
  number: number;
}

export function log({ base, number }: LogInput): number {
  return MathJS.log(number, base ?? MathJS.e);
}
