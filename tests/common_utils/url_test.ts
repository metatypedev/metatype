// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { assertEquals } from "@std/assert";
import { createUrl } from "@metatype/typegate/utils.ts";
Deno.test("createUrl behavior", async (t) => {
  await t.step("append path and remove dbl slashes", () => {
    const base = "https://example.com";
    assertEquals(
      createUrl(base, "///to////path"),
      createUrl(base, "/to/path"),
    );
  });

  await t.step("append path and add query parameters", () => {
    const base = "https://example.com";
    const params = new URLSearchParams();
    params.append("a", "one");
    params.append("b", "two");
    params.append("a", "three");

    assertEquals(
      createUrl(base, "/to/path", params),
      `${base}/to/path?a=one&b=two&a=three`,
    );
    assertEquals(
      createUrl(base, "/to/path", params),
      createUrl(base, "to/path", params),
    );
  });

  await t.step("merge query parameters", () => {
    const base = "https://example.com";
    const params = new URLSearchParams();
    params.append("b", "two");
    assertEquals(
      createUrl(base, "to/path?a=one", params),
      `${base}/to/path?a=one&b=two`,
    );
  });
});
