interface AddInput {
  a: number;
  b: number;
}
export function doAddition({ a, b }: AddInput) {
  return a + b;
}
