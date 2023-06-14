
interface ThreeInput {
  b: number;
  a: number;
}

export function three({ a, b }: ThreeInput,
  { context }: { context: Record<string, unknown> }
): {
  a: number;
  b: number;
} {
  return { a: 0, b: 0 };
}
