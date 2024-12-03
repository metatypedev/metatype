// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { assertEquals } from "@std/assert";
import { Meta } from "../../utils/mod.ts";
import {
  evalExpr,
  ExecutionStatus,
  Expr,
  SearchItem,
} from "@metatype/typegate/runtimes/substantial/filter_utils.ts";

function addDays(date: Date, days: number) {
  const ret = new Date(date);
  ret.setDate(ret.getDate() + days);
  return ret;
}

function val(x: unknown) {
  return JSON.stringify(x);
}

export function testData() {
  const samples = [
    { "COMPLETED_WITH_ERROR": "Fatal: error" },
    { "COMPLETED": true },
    { "ONGOING": undefined },
    { "COMPLETED": [1, 2, ["three"]] },
    { "ONGOING": undefined },
    { "COMPLETED_WITH_ERROR": { nested: { object: 1234 }, b: 4 } },
    { "COMPLETED": null },
    { "COMPLETED": 1 },
    { "COMPLETED_WITH_ERROR": 2 },
    { "COMPLETED": 3 },
  ] satisfies Array<{ [K in ExecutionStatus]?: unknown }>;

  const dataset = [];

  let start = new Date("2024-01-01"), end = null;
  for (let i = 0; i < samples.length; i += 1) {
    end = addDays(start, 1);
    const [status, value] = Object.entries(samples[i])[0] as [
      ExecutionStatus,
      unknown,
    ];

    dataset.push(
      new SearchItem(
        `fakeUUID#${i}`,
        start.toJSON(),
        status == "ONGOING" ? null : end.toJSON(),
        status,
        value,
      ),
    );

    if (i % 2 == 0) {
      start = end;
    }
  }

  return dataset;
}

Meta.test("base filter logic", async (t) => {
  const testShould = async (
    fact: string,
    data: { filter: Expr; expected: Array<unknown> },
  ) => {
    await t.should(fact, () => {
      const items = testData();
      const searchResults = [];
      for (const item of items) {
        if (evalExpr(item, data.filter, ["<root>"])) {
          searchResults.push(item.toSearchResult());
        }
      }
      assertEquals(searchResults, data.expected);
    });
  };

  // ------------------
  await testShould("be able discriminate truthy values and 1)", {
    filter: { eq: val(1) },
    expected: [
        {
        ended_at: "2024-01-06T00:00:00.000Z",
        run_id: "fakeUUID#7",
        started_at: "2024-01-05T00:00:00.000Z",
        status: "COMPLETED",
        value: "1",
        },
    ]
  });

  await testShould('work with null and special values (e.g. "status")', {
    filter: {
      or: [
        { status: { eq: val("ONGOING") } },
        { eq: val(null) },
      ],
    },
    expected: [
      {
        run_id: "fakeUUID#2",
        started_at: "2024-01-02T00:00:00.000Z",
        ended_at: null,
        status: "ONGOING",
        value: undefined,
      },
      {
        run_id: "fakeUUID#4",
        started_at: "2024-01-03T00:00:00.000Z",
        ended_at: null,
        status: "ONGOING",
        value: undefined,
      },
    {
        ended_at: "2024-01-05T00:00:00.000Z",
        run_id: "fakeUUID#6",
        started_at: "2024-01-04T00:00:00.000Z",
        status: "COMPLETED",
        value: "null",
    }
    ],
  });

  await testShould('work with "in" and "contains" operators', {
    filter: {
      or: [
        {
          and: [
            { contains: val(1) },
            { contains: val(["three"]) },
          ],
        },
        { contains: val({ nested: { object: 1234 } })},
        { in: val("Fatal: error+ some other string") },
      ],
    },
    expected: [
      {
        run_id: "fakeUUID#0",
        started_at: "2024-01-01T00:00:00.000Z",
        ended_at: "2024-01-02T00:00:00.000Z",
        status: "COMPLETED_WITH_ERROR",
        value: '"Fatal: error"',
      },
      {
        run_id: "fakeUUID#3",
        started_at: "2024-01-03T00:00:00.000Z",
        ended_at: "2024-01-04T00:00:00.000Z",
        status: "COMPLETED",
        value: '[1,2,["three"]]',
      },
    ],
  });

  await testShould(
    "be able to compare numbers and strings on all kinds of terms (special + simple) ",
    {
      filter: {
        or: [
          {
            and: [
              { started_at: { gte: val("2024-01-02") } },
              { not: { not: { ended_at: { eq: val(null) } } } },
            ],
          },
          { lte: val(1) },
        ],
      },
      expected: [
        {
          run_id: "fakeUUID#2",
          started_at: "2024-01-02T00:00:00.000Z",
          ended_at: null,
          status: "ONGOING",
          value: undefined,
        },
        {
          run_id: "fakeUUID#4",
          started_at: "2024-01-03T00:00:00.000Z",
          ended_at: null,
          status: "ONGOING",
          value: undefined,
        },
        {
          run_id: "fakeUUID#7",
          started_at: "2024-01-05T00:00:00.000Z",
          ended_at: "2024-01-06T00:00:00.000Z",
          status: "COMPLETED",
          value: "1",
        },
      ],
    },
  );
});
