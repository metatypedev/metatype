// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import {
  HexColor,
  RGBColor,
} from "https://deno.land/x/color_util@1.0.1/mod.ts";

interface ConvertInput {
  to: "rgb" | "hex" | "colorName";
  color: Array<number> | string | "red" | "green" | "blue" | "black" | "white";
}

type ConvertOutput =
  | Array<number>
  | string
  | "red"
  | "green"
  | "blue"
  | "black"
  | "white";

const colorNameToRGB = {
  red: [255, 0, 0],
  green: [0, 255, 0],
  blue: [0, 0, 255],
  black: [0, 0, 0],
  white: [255, 255, 255],
};

type colorFormat = "rgb" | "hex" | "colorName";

function getColorFormat(
  color: Array<number> | string,
): colorFormat {
  if (Array.isArray(color)) {
    return "rgb";
  } else if (color.startsWith("#")) {
    return "hex";
  } else {
    return "colorName";
  }
}

function rgbToArray(rgb: RGBColor): Array<number> {
  return [rgb.red, rgb.green, rgb.blue];
}

export function convert(
  { color, to }: ConvertInput,
  { context: _ }: { context: Record<string, unknown> },
): ConvertOutput {
  const format = getColorFormat(color);

  switch (format) {
    case "rgb": {
      const rgb = new RGBColor(...color);

      switch (to) {
        case "rgb":
          return color;

        case "hex": {
          const colorHex = rgb.toHex();
          return colorHex.hex;
        }

        case "colorName":
          throw new Error("RGB to color name not supported");
      }
      break;
    }

    case "hex": {
      const hex = new HexColor(color);

      switch (to) {
        case "rgb":
          return rgbToArray(hex.toRGB());

        case "hex":
          return color;

        case "colorName":
          throw new Error("HEX to color name not supported");
      }
      break;
    }

    case "colorName": {
      const rgb = new RGBColor(...colorNameToRGB[color as string]);

      switch (to) {
        case "rgb":
          return rgbToArray(rgb);

        case "hex": {
          const colorHex = rgb.toHex();
          return colorHex.hex;
        }

        case "colorName":
          return color;
      }
      break;
    }
  }
}
