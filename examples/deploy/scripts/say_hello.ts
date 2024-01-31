import { concat } from "./mod.ts";

export function sayHello({ name }: { name: string }) {
  return { message: concat("Hello", " ", name, "!") };
}
