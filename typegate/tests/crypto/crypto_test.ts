// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  decrypt,
  encrypt,
  signJWT,
  unsafeExtractJWT,
  verifyJWT,
} from "../../src/crypto.ts";
import { assertEquals } from "std/testing/asserts.ts";

Deno.test("encrypt/decrypt", async () => {
  const message = "hello world! hello world! hello world!";
  const cipher = await encrypt(message);
  const decoded = await decrypt(cipher);
  assertEquals(message, decoded);
});

Deno.test("sign/verify", async () => {
  const payload = { message: "hello world! hello world! hello world!" };
  const jwt = await signJWT(payload, 1);
  const decoded = await verifyJWT(jwt);
  assertEquals(payload.message, decoded.message);
});

Deno.test("sign/decode", async () => {
  const payload = { message: "hello world! hello world! hello world!" };
  const jwt = await signJWT(payload, 1);
  const decoded = await unsafeExtractJWT(jwt);
  assertEquals(payload.message, decoded.message);
});
