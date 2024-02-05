import { concat } from "./import.ts";

export function sayHello({ name }: { name: string }) {
  return concat("Hello", " ", name, "!");
}
