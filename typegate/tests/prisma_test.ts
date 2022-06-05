import { gql, test } from "./utils.ts";

test("prisma", async (t) => {
  const e = await t.pythonFile("./tests/typegraphs/prisma.py");
});
