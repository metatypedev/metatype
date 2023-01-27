// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";
import * as mf from "test/mock_fetch";

mf.install();

type OutputResult = {
  self_content_type: string;
  total: number;
  steps: number;
};

function rangeSum(start: number, end: number) {
  let total = 0;
  for (let i = start; i <= end; total += i++);
  const steps = end - start + 1;
  return { total, steps };
}

function removeRandomBoundary(result: OutputResult): OutputResult {
  const { self_content_type, total, steps } = result;
  return {
    self_content_type: self_content_type.split(";").shift() ??
      "",
    total,
    steps,
  };
}

test("http custom content-type queries", async (t) => {
  const e = await t.pythonFile("http/http_content_type.py");

  mf.mock("POST@/api/sum_range", async (req) => {
    const formData: FormData = await req.formData();
    // the boundary is expected to be randomized
    console.log(
      "content-type assigned: ",
      req.headers.get("content-type"),
    );
    const start = Number(formData.get("start") ?? 0);
    const end = Number(formData.get("end") ?? 1);
    const result = removeRandomBoundary({
      self_content_type: req.headers.get("content-type") ?? "",
      ...rangeSum(start, end),
    });
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
        sumRangeWithFormData: removeRandomBoundary({
          self_content_type: "multipart/form-data",
          total: 5050,
          steps: 101,
        }),
      })
      .on(e);
  });
});
