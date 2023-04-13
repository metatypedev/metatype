// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { assertEquals } from "std/testing/asserts.ts";
import { createUrl } from "../../src/utils.ts";
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
