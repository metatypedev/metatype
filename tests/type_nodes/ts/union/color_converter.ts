// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  HexColor,
  RGBColor,
} from "https://deno.land/x/color_util@1.0.1/mod.ts";

type RGBArray = [number, number, number];

type RGBStruct = {
  r: number;
  g: number;
  b: number;
};

type ColorName = "red" | "green" | "blue" | "black" | "white";

type HexColor = `#${string}`;

type Color = RGBArray | RGBStruct | HexColor | ColorName;
interface ConvertInput {
  color: Color;
  to: "rgb_array" | "rgb_struct" | "hex" | "colorName";
}

type ConvertOutput = Color;

const colorNameToRGB = {
  red: [255, 0, 0],
  green: [0, 255, 0],
  blue: [0, 0, 255],
  black: [0, 0, 0],
  white: [255, 255, 255],
} as Record<string, [number, number, number]>;

type ColorFormat = "rgb_array" | "rgb_struct" | "hex" | "named_color";

function getColorFormat(color: Color): ColorFormat {
  if (Array.isArray(color)) {
    return "rgb_array";
  }
  if (typeof color === "string") {
    if (color.startsWith("#")) {
      return "hex";
    }
    return "named_color";
  }
  return "rgb_struct";
}

function rgbToArray(rgb: RGBColor): RGBArray {
  return [rgb.red, rgb.green, rgb.blue];
}

function parseRGB(color: Color) {
  if (typeof color === "object") {
    if ("r" in color) {
      return new RGBColor(color.r, color.g, color.b);
    } else {
      return new RGBColor(...color);
    }
  } else {
    throw new Error(`cannot parse RGB from ${color}`);
  }
}

export function convert(
  { color, to }: ConvertInput,
  { context: _ }: { context: Record<string, unknown> },
): ConvertOutput {
  const format = getColorFormat(color as Color);

  switch (format) {
    case "rgb_array":
    case "rgb_struct": {
      const rgb = parseRGB(color);

      if (to == "rgb_array") {
        return color;
      }

      if (to == "rgb_struct") {
        return {
          r: rgb.red,
          g: rgb.green,
          b: rgb.blue,
        };
      }

      if (to == "hex") {
        const colorHex = rgb.toHex();
        return colorHex.toString();
      }

      throw new Error("RGB to color name not supported");
    }

    case "hex": {
      const hex = new HexColor(color as string);

      if (to == "rgb_array" || to == "rgb_struct") {
        return rgbToArray(hex.toRGB());
      }

      if (to == "hex") {
        return color;
      }

      throw new Error("HEX to color name not supported");
    }

    case "named_color": {
      const rgbValues = colorNameToRGB[color as ColorName];
      const rgb = parseRGB(rgbValues);

      if (to == "rgb_array" || to == "rgb_struct") {
        return rgbToArray(rgb);
      }

      if (to == "hex") {
        const colorHex = rgb.toHex();
        return colorHex.toString();
      }

      return color;
    }
  }
}
