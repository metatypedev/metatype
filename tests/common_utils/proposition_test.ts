// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { assertEquals } from "std/assert/mod.ts";
import { closestWord } from "../../src/utils.ts";
Deno.test("closest word proposition", async (t) => {
  await t.step("basic edgecases", () => {
    assertEquals(closestWord("", []), null);
    assertEquals(
      closestWord("usr", ["usssername", "username"], false, 3),
      null,
    );
    assertEquals(
      closestWord("", ["f", "first"], false, 1),
      "f",
    );
    assertEquals(
      closestWord("", ["f", "first", ""], false, 1),
      "",
    );
    // loosely equal
    assertEquals(
      closestWord("any", ["aNy", "ANY", "any"], true, 0),
      "aNy",
    );
    // strictly equal
    assertEquals(
      closestWord("any", ["aNy", "ANY", "any"], false, 0),
      "any",
    );
  });

  await t.step("default call", () => {
    // Note: ignoreCase: true by default
    assertEquals(
      closestWord("users", ["us", "user", "getUsers"]),
      "user",
    );
    assertEquals(
      closestWord("send_mesage", ["sendMessages", "sendFile", "sendMsg"]),
      "sendMessages",
    );
  });
});
