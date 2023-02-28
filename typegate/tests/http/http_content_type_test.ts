// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";
import * as mf from "test/mock_fetch";

mf.install();

type OutputResult = {
  self_content_type: string;
  total: number;
  steps: number;
};

type OutputTempResult = {
  farenheit: number;
  qinfos: {
    queryUrl: string;
    formData: {
      celcius: number;
      rounded: boolean;
    };
  };
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

function celciusToFarenheit(celcius: number, rounded: boolean) {
  const ans = celcius * 1.8 + 32;
  return rounded ? Math.round(ans) : ans;
}

function parseBool(str: string | undefined | null) {
  if (!str) return false;
  if (str == "true") return true;
  if (str == "false") return false;
  throw Error(`cannot convert "${str}" as boolean`);
}

test("http custom content-type queries", async (t) => {
  const e = await t.pythonFile("http/http_content_type.py");

  mf.mock("POST@/api/sum_range", async (req) => {
    const formData: FormData = await req.formData();
    // the boundary is expected to be randomized
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

  mf.mock("POST@/api/celcius_to_farenheit", async (req) => {
    const formData: FormData = await req.formData();
    console.log(
      "content-type assigned: ",
      req.headers.get("content-type"),
    );

    const url = new URL(req.url);
    console.info("> query params:", url.search);
    console.info("> formData:", formData);
    const rounded = parseBool(formData.get("rounded")?.toString());
    const celcius = Number(formData.get("celcius") ?? 0);
    const result = {
      farenheit: celciusToFarenheit(celcius, rounded),
      qinfos: {
        queryUrl: url.search,
        formData: {
          celcius,
          rounded: formData.has("rounded") ? rounded : null,
        },
      },
    } as OutputTempResult;
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

  await t.should("rename and work without a nameclash", async () => {
    await gql`
      mutation {
        celciusToFarenheit(
          celcius: 3,
          roundedTo: true, # renamed as rounded in the body
          celcius_query_one: 1, # renamed as celcius in the query params
          celcius_query_two: 2, # renamed as celcius in the query params
          celcius_query_three: 3 # renamed as the_third in the query params
        ) {
          farenheit
          qinfos {
            queryUrl
            formData {
              celcius
              rounded # proves that roundedTo has been renamed to rounded in the body
            }
          }
        }
      }
    `
      .expectData({
        celciusToFarenheit: {
          farenheit: 37,
          qinfos: {
            // celcius_query renamed to celcius
            queryUrl: "?celcius=1&celcius=2&the_third=3",
            formData: {
              celcius: 3,
              rounded: true,
            },
          },
        },
      })
      .on(e);
  });
});
