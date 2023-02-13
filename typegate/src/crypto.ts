// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { crypto } from "std/crypto/mod.ts";
import * as base64 from "std/encoding/base64url.ts";
import config from "./config.ts";
import * as jwt from "jwt";

export const sha1 = (text: string | Uint8Array): Promise<string> => {
  return crypto.subtle
    .digest(
      "SHA-1",
      typeof text === "string" ? new TextEncoder().encode(text) : text,
    )
    .then(base64.encode);
};

export const sha256 = (text: string | Uint8Array): Promise<string> => {
  return crypto.subtle
    .digest(
      "SHA-256",
      typeof text === "string" ? new TextEncoder().encode(text) : text,
    )
    .then(base64.encode);
};

export const signKey = await crypto.subtle.importKey(
  "raw",
  config.tg_secret,
  { name: "HMAC", hash: { name: "SHA-256" } },
  false,
  ["sign", "verify"],
);

export const encryptionKey = await crypto.subtle.importKey(
  "raw",
  config.tg_secret.slice(0, 32),
  { name: "AES-GCM" },
  false,
  ["encrypt", "decrypt"],
);

const ivLength = 16;

export async function encrypt(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const iv = crypto.getRandomValues(new Uint8Array(ivLength));
  const cipher = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    encryptionKey,
    data,
  );
  const buffer = new Uint8Array(ivLength + cipher.byteLength);
  buffer.set(iv, 0);
  buffer.set(new Uint8Array(cipher), ivLength);
  return base64.encode(buffer.buffer);
}

export async function decrypt(payload: string): Promise<string> {
  const buffer = base64.decode(payload);
  const iv = buffer.slice(0, ivLength);
  const cipher = buffer.slice(ivLength);
  const data = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    encryptionKey,
    cipher,
  );
  return new TextDecoder().decode(data);
}

export async function signJWT(
  payload: Record<string, unknown>,
  duration: number,
): Promise<string> {
  return await jwt.create(
    { alg: "HS256", typ: "JWT" },
    {
      ...payload,
      exp: jwt.getNumericDate(duration),
      iat: Math.floor(new Date().valueOf() / 1000),
    },
    signKey,
  );
}

export async function verifyJWT(
  token: string,
): Promise<Record<string, unknown>> {
  const payload = await jwt.verify(token, signKey);
  return payload as Record<string, unknown>;
}

export async function unsafeExtractJWT(
  token: string,
): Promise<Record<string, unknown>> {
  const [, payload] = await jwt.decode(token);
  return payload as Record<string, unknown>;
}
