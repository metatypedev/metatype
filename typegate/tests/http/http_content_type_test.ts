// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";
import * as mf from "test/mock_fetch";

mf.install();

function rangeSum(start: number, end: number) {
  let total = 0;
  for (let i = start; i <= end; total += i++);
  const steps = end - start + 1;
  return { total, steps };
}

test("http custom content-type queries", async (t) => {
  const e = await t.pythonFile("http/http_content_type.py");

  mf.mock("POST@/api/sum_range", (req) => {
    const params = new URL(req.url).searchParams;
    const start = Number(params.get("start") ?? 0);
    const end = Number(params.get("end") ?? 1);
    const result = {
      self_content_type: req.headers.get("content-type"),
      ...rangeSum(start, end),
    };
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  });

  await t.should("work with content-type = multipart/form-data", async () => {
    await gql`
      mutation {
        sumRangeWithFormData(start: 0, end: 100) {
          self_content_type
          total
          steps
        }
      }
    `
      .expectData({
        sumRangeWithFormData: {
          self_content_type: "multipart/form-data",
          total: 5050,
          steps: 101,
        },
      })
      .on(e);
  });
});
