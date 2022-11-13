import * as hmac from "https://deno.land/x/hmac@v2.0.1/mod.ts";
import * as base64 from "https://deno.land/std/encoding/base64url.ts";
import * as hex from "https://deno.land/std/encoding/hex.ts";

interface ISend {
  width: number;
  height: number;
  path: string;
}

const encode = (s: string) => new TextEncoder().encode(s);

export default async function (
  { width, height, path }: ISend,
  { secrets },
) {
  const resource = base64.encode(`s3://${path}`);
  const uri = `/rt:fill/s:${width}:${height}/${resource}`;

  const digest = hmac.hmac(
    "sha256",
    hex.decode(encode(secrets.IMGPROXY_SECRET)),
    new Uint8Array([
      ...hex.decode(encode(secrets.IMGPROXY_SALT)),
      ...encode(uri),
    ]),
  );
  return `http://localhost:9002/${base64.encode(digest)}${uri}`;
}
