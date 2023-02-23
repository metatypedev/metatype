// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import {
  HexColor,
  RGBColor,
} from "https://deno.land/x/color_util@1.0.1/mod.ts";

interface ConvertInput {
  color:
    | Array<number>
    | {
      b: number;
      r: number;
      g: number;
    }
    | string
    | "red"
    | "green"
    | "blue"
    | "black"
    | "white";
  to: "rgb_array" | "rgb_struct" | "hex" | "colorName";
}

type ConvertOutput =
  | Array<number>
  | {
    g: number;
    r: number;
    b: number;
  }
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
} as Record<string, [number, number, number]>;

type colorFormat = "rgb_array" | "rgb_struct" | "hex" | "colorName";

type RGB_ARRAY = [number, number, number];
type RGB_STRUCT = {
  r: number;
  g: number;
  b: number;
};

type Color = RGB_ARRAY | RGB_STRUCT | string;

function getColorFormat(color: Color): colorFormat {
  if (Array.isArray(color)) {
    return "rgb_array";
  } else if (typeof color == "string" && color.startsWith("#")) {
    return "hex";
  } else if (typeof color == "object") {
    return "rgb_struct";
  } else {
    return "colorName";
  }
}

function rgbToArray(rgb: RGBColor): Array<number> {
  return [rgb.red, rgb.green, rgb.blue];
}

function parseRGB(color: ConvertInput["color"]) {
  if (Array.isArray(color)) {
    return new RGBColor(...(color as [number, number, number]));
  } else if (typeof color == "object") {
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

    case "colorName": {
      const rgbValues = colorNameToRGB[color as string];
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
