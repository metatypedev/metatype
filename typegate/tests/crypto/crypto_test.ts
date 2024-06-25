// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  defaultTypegateConfigBase,
  getTypegateConfig,
} from "../../src/config.ts";
import { TypegateCryptoKeys, unsafeExtractJWT } from "../../src/crypto.ts";
import { assertEquals } from "std/assert/mod.ts";

const gateConfig = getTypegateConfig({
  base: defaultTypegateConfigBase,
  sync: {},
});
const crypto = await TypegateCryptoKeys.init(gateConfig.base.tg_secret);

Deno.test("encrypt/decrypt", async () => {
  const message = "hello world! hello world! hello world!";
  const cipher = await crypto.encrypt(message);
  const decoded = await crypto.decrypt(cipher);
  assertEquals(message, decoded);
});

Deno.test("sign/verify", async () => {
  const payload = { message: "hello world! hello world! hello world!" };
  const jwt = await crypto.signJWT(payload, 1);
  const decoded = await crypto.verifyJWT(jwt);
  assertEquals(payload.message, decoded.message);
});

Deno.test("sign/decode", async () => {
  const payload = { message: "hello world! hello world! hello world!" };
  const jwt = await crypto.signJWT(payload, 1);
  const decoded = await unsafeExtractJWT(jwt);
  assertEquals(payload.message, decoded.message);
});
