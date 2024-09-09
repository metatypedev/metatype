// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta, sleep } from "../../utils/mod.ts";
import { assertExists, assertEquals } from "@std/assert";

Meta.test(
  {
    name: "Substantial runtime and workflow execution lifecycle",
  },
  async (t) => {
    const e = await t.engine("runtimes/substantial/substantial.py");

    let currentRunId: string | null = null;
    await t.should("start a workflow and return its run id", async () => {
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
          resources {
            workflow
            count
            running {
              run_id
            }
          }
        }
      `
        .expectData({
          resources: {
            workflow: "saveAndSleepExample",
            count: 1,
            running: [{ run_id: currentRunId }],
          },
        })
        .on(e);
    });

    // 2s + 2s + 5s = 9s, + some margins (a relaunch after interrupt takes 2s break by default)
    await sleep(12 * 1000);

    //   await t.should("complete execution", async () => {
    //     await gql`
    //       query {
    //         resources {
    //           workflow
    //           count
    //         }
    //         results {
    //           run_id
    //           result {
    //             value
    //             status
    //           }
    //         }
    //       }
    //     `
    //       .expectData({
    //         resources: {
    //           workflow: "saveAndSleepExample",
    //           count: 0,
    //         },
    //         results: [
    //           {
    //             run_id: currentRunId,
    //             result: {
    //               value: 30,
    //               status: "COMPLETED",
    //             },
    //           },
    //         ],
    //       })
    //       .on(e);
    //   });
  }
);

// Meta.test(
//   {
//     name: "Substantial async events",
//   },
//   async (t) => {
//     const e = await t.engine("runtimes/substantial/substantial.py");

//     const emails = [
//       "one@example.com",
//       "two@example.com",
//       "three@example.comn",
//     ] as [string, string, string];
//     const runIds = [] as Array<string>;

//     await t.should("start email workflows concurrently", async () => {
//       await gql`
//         mutation {
//           one: start_email(kwargs: { to: $email_one })
//           two: start_email(kwargs: { to: $email_two })
//           three: start_email(kwargs: { to: $email_three })
//         }
//       `
//         .withVars({
//           email_one: emails[0],
//           email_two: emails[1],
//           email_three: emails[2],
//         })
//         .expectBody((body) => {
//           const one = body.data?.one! as string;
//           const two = body.data?.two! as string;
//           const three = body.data?.three! as string;
//           assertExists(one, "one runId");
//           assertExists(two, "two runId");
//           assertExists(three, "three runId");

//           runIds.push(...[one, two, three]);
//         })
//         .on(e);
//     });

//     // let's wait for a bit to make sure interrupts are doing their jobs
//     await sleep(5 * 1000);

//     await t.should(
//       `fire "confirmation" events for "${emails.join(", ")}"`,
//       async () => {
//         await gql`
//           mutation {
//             # will pass
//             one: send_confirmation(
//               event_name: "confirmation"
//               run_id: $one_run_id
//               payload: true
//             )
//             # will throw
//             two: send_confirmation(
//               event_name: "confirmation"
//               run_id: $two_run_id
//               payload: false
//             )
//             # will abort
//             three: abort_email_confirmation(run_id: $three_run_id)
//           }
//         `
//           .withVars({
//             one_run_id: runIds[0],
//             two_run_id: runIds[1],
//             three_run_id: runIds[2],
//           })
//           .expectData({
//             one: runIds[0],
//             two: runIds[1],
//             three: runIds[2],
//           })
//           .on(e);
//       }
//     );

//     // This is arbitrary, if ops are leaking that means it should be increased
//     // Noticing the fired event may take a few seconds depending on `substantial_relaunch_ms`
//     // Once noticed the workflow will complete and the worker destroyed
//     await sleep(5 * 1000);

//     await t.should("complete execution", async () => {
//       await gql`
//         query {
//           ask_ongoing_emails {
//             count
//           }
//           ask_email_results {
//             run_id
//             result {
//               value
//               status
//             }
//           }
//         }
//       `
//         .expectBody((body) => {
//           assertEquals(
//             body?.data?.ask_ongoing_emails?.count,
//             0,
//             "zero workflow currently running"
//           );

//           const localSorter = (a: any, b: any) =>
//             a.run_id.localeCompare(b.run_id);

//           const received = body?.data?.ask_email_results ?? ([] as Array<any>);
//           const expected = [
//             {
//               run_id: runIds[0],
//               result: {
//                 value: 'Email sent to one@example.com: "confirmed!"',
//                 status: "COMPLETED",
//               },
//             },
//             {
//               run_id: runIds[1],
//               result: {
//                 value: "two@example.com has denied the subscription",
//                 status: "COMPLETED_WITH_ERROR",
//               },
//             },
//           ];

//           assertEquals(
//             received.sort(localSorter),
//             expected.sort(localSorter),
//             "complete only two workflows as one was aborted"
//           );
//         })
//         .on(e);
//     });
//   }
// );
