interface Test {
  a: string;
  b: number;
}
import type { Test as Input } from "./output.ts";

type Output = number;

export function apply(v: Input): Output {
  console.log("test");
  return 3 * v.b;
}

console.log(apply({ a: "A", b: 2 }));
