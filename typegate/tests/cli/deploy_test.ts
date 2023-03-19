import { gql, meta, test, testDir } from "../utils.ts";
import { init } from "../prisma/prisma_seed.ts";

const port = 7895;

test("test `meta deploy`", async (t) => {
  const e = await init(t);

  const configs = [
    "--gate",
    `http://localhost:${port}`,
      "--username",
    "admin",
    "--password",
    "password",
    e.name,
  ];

  await t.should("fail to access database", async () => {
    await gql`
      query {
        findManyRecords {
          id
        }
      }
    `
      .expectErrorContains("table `test.record` does not exist")
      .on(e);
  });

  await t.should("create migrations", async() => {
    await meta("prisma", "")

  });

  await t.should("run migrations", async () => {
    await meta("deploy", ...configs);
  });
  
}, { systemTypegraphs: true, port });
