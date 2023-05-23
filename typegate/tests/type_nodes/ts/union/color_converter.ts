// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  HexColor,
  RGBColor,
} from "https://deno.land/x/color_util@1.0.1/mod.ts";

type RGBArray = { rgb: [number, number, number] };

type RGBStruct = {
  r: number;
  g: number;
  b: number;
};

type ColorName =
  | "red"
  | "green"
  | "blue"
  | "black"
  | "white";

type Color = RGBArray | RGBStruct | { hex: string } | { name: ColorName };
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
  if ("rgb" in color && Array.isArray(color.rgb)) {
    return "rgb_array";
  }
  if ("name" in color && typeof color.name === "string") {
    return "named_color";
  }
  if (
    "hex" in color && typeof color.hex === "string" && color.hex.startsWith("#")
  ) {
    return "hex";
  }
  return "rgb_struct";
}

function rgbToArray(rgb: RGBColor): RGBArray["rgb"] {
  return [rgb.red, rgb.green, rgb.blue];
}

function parseRGB(color: Color) {
  if ("rgb" in color) {
    return new RGBColor(...color.rgb);
  } else if ("r" in color) {
    return new RGBColor(color.r, color.g, color.b);
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
        return { hex: colorHex.toString() };
      }

      throw new Error("RGB to color name not supported");
    }

    case "hex": {
      const hex = new HexColor((color as { hex: string }).hex);

      if (to == "rgb_array" || to == "rgb_struct") {
        return { rgb: rgbToArray(hex.toRGB()) };
      }

      if (to == "hex") {
        return color;
      }

      throw new Error("HEX to color name not supported");
    }

    case "named_color": {
      const rgbValues = colorNameToRGB[(color as { name: string }).name];
      const rgb = parseRGB({ rgb: rgbValues });

      if (to == "rgb_array" || to == "rgb_struct") {
        return { rgb: rgbToArray(rgb) };
      }

      if (to == "hex") {
        const colorHex = rgb.toHex();
        return { hex: colorHex.toString() };
      }

      return color;
    }
  }
}
