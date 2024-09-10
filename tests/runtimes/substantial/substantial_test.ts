// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta, sleep } from "../../utils/mod.ts";
import { assertExists } from "@std/assert";

Meta.test(
  {
    name: "Substantial runtime and workflow run lifecycle",
  },
  async (t) => {
    const e = await t.engine("runtimes/substantial/substantial.py");

    let currentRunId: string | null = null;
    await t.should("Start a workflow and return its run id", async () => {
      await gql`
        mutation {
          start(kwargs: { a: 10, b: 20 })
        }
      `
        .expectBody((body) => {
          currentRunId = body.data?.start! as string;
          assertExists(
            currentRunId,
            "Run id was not returned when workflow was started"
          );
        })
        .on(e);
    });

    await t.should("list the ongoing runs", async () => {
      await gql`
        query {
          ressources {
            workflow
            count
            running {
              run_id
            }
          }
        }
      `
        .expectData({
          ressources: {
            workflow: "saveAndSleep",
            count: 1,
            running: [{ run_id: currentRunId }],
          },
        })
        .on(e);
    });

    // 2s + 2s + 5s = 9s, + some margins (a relaunch after interrupt takes 2s break by default)
    await sleep(12 * 1000);

    await t.should("complete execution", async () => {
      await gql`
        query {
          ressources {
            workflow
            count
          }
          results {
            run_id
            result {
              value
              status
            }
          }
        }
      `
        .expectData({
          ressources: {
            workflow: "saveAndSleep",
            count: 0,
          },
          results: [
            {
              run_id: currentRunId,
              result: {
                value: 30,
                status: "COMPLETED",
              },
            },
          ],
        })
        .on(e);
    });
  }
);
