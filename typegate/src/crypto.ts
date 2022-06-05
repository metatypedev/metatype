import { crypto } from "std/crypto/mod.ts";
import * as base64 from "std/encoding/base64url.ts";

export const sha1 = async (text: string): Promise<string> => {
  return crypto.subtle
    .digest("SHA-1", new TextEncoder().encode(text))
    .then((hex: ArrayBuffer) => base64.encode(new TextDecoder().decode(hex)));
};
