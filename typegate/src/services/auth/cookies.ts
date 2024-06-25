// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { deleteCookie, getCookies, setCookie } from "std/http/cookie.ts";
import { TypegateCryptoKeys } from "../../crypto.ts";
import { globalConfig } from "../../config.ts";

export async function getEncryptedCookie(
  headers: Headers,
  name: string,
  cryptoKeys: TypegateCryptoKeys,
): Promise<any> {
  const cookies = getCookies(headers);
  const encrypted = cookies[name];
  if (!encrypted) {
    throw new Error("missing cookie");
  }
  const value = await cryptoKeys.decrypt(encrypted);
  return JSON.parse(value);
}

export async function setEncryptedSessionCookie(
  hostname: string,
  name: string,
  value: any,
  cryptoKeys: TypegateCryptoKeys,
): Promise<Headers> {
  const headers = new Headers();
  const encrypted = await cryptoKeys.encrypt(JSON.stringify(value));
  setCookie(headers, {
    // no maxAge or expires, so cookie expires at end of session
    name,
    value: encrypted,
    domain: hostname,
    path: `/${name}`,
    secure: !globalConfig.debug,
    sameSite: "Lax",
    httpOnly: true,
  });
  return headers;
}

export function clearCookie(
  domain: string,
  name: string,
  headers: Headers,
): Headers {
  deleteCookie(headers, name, {
    path: `/${name}`,
    domain,
  });
  return headers;
}
