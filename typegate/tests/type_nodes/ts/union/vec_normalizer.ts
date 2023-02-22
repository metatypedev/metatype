// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

type Color = {
  R: number;
  G: number;
  B: number;
};

type Vec3 = {
  x: number;
  y: number;
  z: number;
};

type Pair = { first: number; second: number };
type AxisPairs = {
  xy: Pair | number[];
  xz: Pair | number[];
  yz: Pair | number[];
};

type NormalizeInput = {
  x: number;
  y: number;
  z: number;
  as: string;
};

type NormalizeOutput = Color | Vec3 | AxisPairs;

function makePair(first: number, second: number): Pair {
  return { first, second };
}

export function normalize(
  { x, y, z, as }: NormalizeInput,
  { context: _ }: { context: Record<string, unknown> },
): NormalizeOutput {
  const len = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
  if (len == 0) {
    throw Error("0 vector does not have a length");
  }
  x = x / len;
  y = y / len;
  z = z / len;
  switch (as) {
    case "vec":
      return { x, y, z };
    case "color":
      return { R: x, G: y, B: z };
    case "pair":
      return {
        xy: makePair(x, y),
        xz: makePair(x, z),
        yz: makePair(y, z),
      };
    case "pair_list":
      return {
        xy: [x, y],
        xz: [x, z],
        yz: [y, z],
      };
    default:
      throw Error(
        `"${as}" is not a valid value, "color", "vec", "pair", "pair_list" was expected`,
      );
  }
}
