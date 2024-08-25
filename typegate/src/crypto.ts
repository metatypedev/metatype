// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { crypto } from "std/crypto/crypto";
import { decodeBase64Url, encodeBase64Url } from "std/encoding";
import * as jwt from "jwt";

export const sha1 = (text: string | Uint8Array): Promise<string> => {
  return crypto.subtle
    .digest(
      "SHA-1",
      typeof text === "string" ? new TextEncoder().encode(text) : text,
    )
    .then(encodeBase64Url);
};

export const sha256 = (text: string | Uint8Array): Promise<string> => {
  return crypto.subtle
    .digest(
      "SHA-256",
      typeof text === "string" ? new TextEncoder().encode(text) : text,
    )
    .then(encodeBase64Url);
};

export class TypegateCryptoKeys {
  readonly ivLength = 16;

  private constructor(
    private signKey: CryptoKey,
    private encryptionKey: CryptoKey,
  ) {}

  static async init(tg_secret: Uint8Array): Promise<TypegateCryptoKeys> {
    const signKey = await crypto.subtle.importKey(
      "raw",
      tg_secret.slice(32, 64),
      { name: "HMAC", hash: { name: "SHA-256" } },
      false,
      ["sign", "verify"],
    );
    const encryptionKey = await crypto.subtle.importKey(
      "raw",
      tg_secret.slice(0, 32),
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );
    return new TypegateCryptoKeys(signKey, encryptionKey);
  }

  async encrypt(message: string): Promise<string> {
    const data = new TextEncoder().encode(message);
    const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
    const cipher = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      this.encryptionKey,
      data,
    );
    const buffer = new Uint8Array(16 + cipher.byteLength);
    buffer.set(iv, 0);
    buffer.set(new Uint8Array(cipher), 16);
    return encodeBase64Url(buffer.buffer);
  }

  async decrypt(payload: string): Promise<string> {
    const buffer = decodeBase64Url(payload);
    const iv = buffer.slice(0, this.ivLength);
    const cipher = buffer.slice(this.ivLength);
    const data = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      this.encryptionKey,
      cipher,
    );
    return new TextDecoder().decode(data);
  }

  async signJWT(
    payload: Record<string, unknown>,
    durationSec: number,
  ): Promise<string> {
    return await jwt.create(
      { alg: "HS256", typ: "JWT" },
      {
        ...payload,
        exp: jwt.getNumericDate(durationSec),
        iat: Math.floor(new Date().valueOf() / 1000),
      },
      this.signKey,
    );
  }

  async verifyJWT(token: string): Promise<Record<string, unknown>> {
    const payload = await jwt.verify(token, this.signKey);
    return payload as Record<string, unknown>;
  }
}

export async function unsafeExtractJWT(
  token: string,
): Promise<Record<string, unknown>> {
  const [, payload] = await jwt.decode(token);
  return payload as Record<string, unknown>;
}

export function randomUUID(): string {
  return crypto.randomUUID();
}
