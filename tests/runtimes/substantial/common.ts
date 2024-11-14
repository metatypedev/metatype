// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { assertEquals, assertExists } from "@std/assert";
import { connect, parseURL } from "redis";
import { gql, Meta, sleep } from "../../utils/mod.ts";
import { MetaTestCleanupFn } from "test-utils/test.ts";

export type BackendName = "fs" | "memory" | "redis";

export const SUB_REDIS = "redis://:password@localhost:6380/0";

export function redisCleanup(url: string) {
  return async () => {
    let redis: any;
    try {
      redis = await connect(parseURL(url));
      await redis.flushall();
    } catch (e) {
      console.error("Failed flushing redis data for substantial");
      throw e;
    } finally {
      redis?.close();
    }
  };
}

export function basicTestTemplate(
  backendName: BackendName,
  {
    delays,
    secrets,
  }: {
    delays: {
      awaitSleepCompleteSec: number;
    };
    secrets?: Record<string, string>;
  },
  cleanup?: MetaTestCleanupFn,
) {
  Meta.test(
    {
      name: `Basic workflow execution lifecycle + interrupts (${backendName})`,
    },
    async (t) => {
      Deno.env.set("SUB_BACKEND", backendName);
      // FIXME: typegate.local not available through workers when using ctx.gql on tests?
      Deno.env.set("TEST_OVERRIDE_GQL_ORIGIN", `http://localhost:${t.port}`);

      cleanup && t.addCleanup(cleanup);

      const e = await t.engine("runtimes/substantial/substantial.py", {
        secrets: {
          MY_SECRET: "Hello",
          ...secrets,
        },
      });

      let currentRunId: string | null = null;
      await t.should(
        `start saveAndSleepExample workflow and return its run id (${backendName})`,
        async () => {
          await gql`
            mutation {
              start_sleep(kwargs: { a: 10, b: 20 })
            }
          `
            .expectBody((body) => {
              currentRunId = body.data?.start_sleep! as string;
              assertExists(
                currentRunId,
                "Run id was not returned when workflow was started",
              );
            })
            .on(e);
        },
      );

      // Let interrupts to do their jobs for a bit
      await sleep(10 * 1000); // including remote_add cost (about 1.5s)

      await t.should(
        `have saveAndSleepExample workflow marked as ongoing (${backendName})`,
        async () => {
          await gql`
            query {
              results(name: "saveAndSleepExample") {
                ongoing {
                  count
                  runs {
                    run_id
                  }
                }
                completed {
                  count
                }
              }
            }
          `
            .expectData({
              results: {
                ongoing: {
                  count: 1,
                  runs: [{ run_id: currentRunId }],
                },
                completed: { count: 0 },
              },
            })
            .on(e);
        },
      );

      await sleep(delays.awaitSleepCompleteSec * 1000);

      await t.should(
        `complete saveAndSleepExample workflow (${backendName})`,
        async () => {
          await gql`
            query {
              results(name: "saveAndSleepExample") {
                ongoing {
                  count
                }
                completed {
                  count
                  runs {
                    run_id
                    result {
                      status
                      value
                    }
                  }
                }
              }
            }
          `
            .expectData({
              results: {
                ongoing: {
                  count: 0,
                },
                completed: {
                  count: 1,
                  runs: [
                    {
                      run_id: currentRunId,
                      result: { status: "COMPLETED", value: 30 },
                    },
                  ],
                },
              },
            })
            .on(e);
        },
      );
    },
  );
}

export function concurrentWorkflowTestTemplate(
  backendName: BackendName,
  {
    delays,
    secrets,
  }: {
    delays: {
      awaitEmailCompleteSec: number;
    };
    secrets?: Record<string, string>;
  },
  cleanup?: MetaTestCleanupFn,
) {
  Meta.test(
    {
      name: `Events and concurrent runs (${backendName})`,
    },
    async (t) => {
      Deno.env.set("SUB_BACKEND", backendName);
      cleanup && t.addCleanup(cleanup);

      const e = await t.engine("runtimes/substantial/substantial.py", {
        secrets: {
          MY_SECRET: "Hello",
          ...secrets,
        },
      });

      const emails = [
        "one@example.com",
        "two@example.com",
        "three@example.com",
      ] as [string, string, string];
      const runIds = [] as Array<string>;
      await t.should(
        `start email workflows concurrently (${backendName})`,
        async () => {
          await gql`
            mutation {
              one: start_email(kwargs: { to: $email_one })
              two: start_email(kwargs: { to: $email_two })
              three: start_email(kwargs: { to: $email_three })
            }
          `
            .withVars({
              email_one: emails[0],
              email_two: emails[1],
              email_three: emails[2],
            })
            .expectBody((body) => {
              const one = body.data?.one! as string;
              const two = body.data?.two! as string;
              const three = body.data?.three! as string;
              assertExists(one, "one runId");
              assertExists(two, "two runId");
              assertExists(three, "three runId");
              runIds.push(...[one, two, three]);
            })
            .on(e);
        },
      );

      // let's wait for a bit to make sure interrupts are doing their jobs
      await sleep(5 * 1000);

      await t.should(
        `fire events for ${emails.join(", ")} (${backendName})`,
        async () => {
          await gql`
            mutation {
              # will pass
              one: send_confirmation(
                run_id: $one_run_id
                event: { payload: true }
              )
              # will throw
              two: send_confirmation(
                run_id: $two_run_id
                event: { payload: false }
              )
              # will abort
              three: stop(run_id: $three_run_id)
            }
          `
            .withVars({
              one_run_id: runIds[0],
              two_run_id: runIds[1],
              three_run_id: runIds[2],
            })
            .expectData({
              one: runIds[0],
              two: runIds[1],
              three: [runIds[2]],
            })
            .on(e);
        },
      );

      // This is arbitrary, if ops are leaking that means it should be increased
      // Noticing the fired event may take a few seconds depending on the interrupt relaunch time and poll interval
      // Once noticed the workflow will complete and the worker destroyed
      // About ~10s for fs and memory
      // About ~12, 16s local redis
      await sleep(delays.awaitEmailCompleteSec * 1000);

      await t.should(`complete execution (${backendName})`, async () => {
        await gql`
          query {
            results(name: "eventsAndExceptionExample") {
              ongoing {
                count
              }
              completed {
                count
                runs {
                  run_id
                  result {
                    status
                    value
                  }
                }
              }
            }
          }
        `
          .expectBody((body) => {
            assertEquals(
              body?.data?.results?.ongoing?.count,
              0,
              `0 workflow currently running (${backendName})`,
            );

            assertEquals(
              body?.data?.results?.completed?.count,
              3,
              `3 workflows completed (${backendName})`,
            );

            const localSorter = (a: any, b: any) =>
              a.run_id.localeCompare(b.run_id);

            const received = body?.data?.results?.completed?.runs ??
              ([] as Array<any>);
            const expected = [
              {
                result: {
                  status: "COMPLETED",
                  value: "Email sent to one@example.com: confirmed!",
                },
                run_id: runIds[0],
              },
              {
                result: {
                  status: "COMPLETED_WITH_ERROR",
                  value: "two@example.com has denied the subscription",
                },
                run_id: runIds[1],
              },
              {
                result: {
                  status: "COMPLETED_WITH_ERROR",
                  value: "ABORTED",
                },
                run_id: runIds[2],
              },
            ];

            assertEquals(
              received.sort(localSorter),
              expected.sort(localSorter),
              `All three workflows have completed, including the aborted one (${backendName})`,
            );
          })
          .on(e);
      });
    },
  );
}

export function retrySaveTestTemplate(
  backendName: BackendName,
  {
    delays,
    secrets,
  }: {
    delays: {
      awaitCompleteAll: number;
    };
    secrets?: Record<string, string>;
  },
  cleanup?: MetaTestCleanupFn,
) {
  Meta.test(
    {
      name: `Retry logic (${backendName})`,
    },
    async (t) => {
      Deno.env.set("SUB_BACKEND", backendName);
      cleanup && t.addCleanup(cleanup);

      const e = await t.engine("runtimes/substantial/substantial.py", {
        secrets: {
          MY_SECRET: "Hello",
          ...secrets,
        },
      });

      let resolvedId: string,
        retryId: string,
        timeoutId: string,
        retryAbortMeId: string;
      await t.should(
        `start retry workflows concurrently (${backendName})`,
        async () => {
          await gql`
            mutation {
              resolved: start_retry(kwargs: { fail: false, timeout: false })
              timeout: start_retry(kwargs: { fail: false, timeout: true })
              retry: start_retry(kwargs: { fail: true, timeout: false })
              retry_abort_me: start_retry(
                kwargs: { fail: true, timeout: false }
              )
            }
          `
            .expectBody((body) => {
              resolvedId = body.data?.resolved! as string;
              retryId = body.data?.retry! as string;
              timeoutId = body.data?.timeout! as string;
              retryAbortMeId = body.data?.retry_abort_me! as string;

              assertExists(resolvedId, "resolve runId");
              assertExists(retryId, "retry runId");
              assertExists(timeoutId, "timeout runId");
              assertExists(retryAbortMeId, "retry_abort_me runId");
            })
            .on(e);
        },
      );

      await sleep(1000);

      await t.should(
        `abort workflow that attempts to retry (${backendName})`,
        async () => {
          await gql`
            mutation {
              abort_retry: stop(run_id: $run_id)
            }
          `
            .withVars({
              run_id: retryAbortMeId,
            })
            .expectData({
              abort_retry: [retryAbortMeId],
            })
            .on(e);
        },
      );

      // Waiting for the retry to finish
      await sleep(delays.awaitCompleteAll * 1000);

      await t.should(
        `complete execution of all retries (${backendName})`,
        async () => {
          await gql`
            query {
              results(name: "retryExample") {
                ongoing {
                  count
                  runs {
                    run_id
                  }
                }
                completed {
                  count
                  runs {
                    run_id
                    result {
                      status
                      value
                    }
                  }
                }
              }
            }
          `
            .expectBody((body) => {
              assertEquals(
                body?.data?.results?.ongoing?.count,
                0,
                `0 workflow currently running (${backendName})`,
              );

              assertEquals(
                body?.data?.results?.completed?.count,
                4,
                `4 workflows completed (${backendName})`,
              );

              const localSorter = (a: any, b: any) =>
                a.run_id.localeCompare(b.run_id);

              const received = body?.data?.results?.completed?.runs ??
                ([] as Array<any>);
              const expected = [
                {
                  result: {
                    status: "COMPLETED",
                    value: "No timeout, No fail",
                  },
                  run_id: resolvedId,
                },
                {
                  result: {
                    status: "COMPLETED_WITH_ERROR",
                    value: "Failed successfully",
                  },
                  run_id: retryId,
                },
                {
                  result: {
                    status: "COMPLETED_WITH_ERROR",
                    value: "ABORTED",
                  },
                  run_id: retryAbortMeId,
                },
                {
                  result: {
                    status: "COMPLETED_WITH_ERROR",
                    value: "Save timed out",
                  },
                  run_id: timeoutId,
                },
              ];

              assertEquals(
                received.sort(localSorter),
                expected.sort(localSorter),
                `All workflows have completed (${backendName})`,
              );
            })
            .on(e);
        },
      );
    },
  );
}

export function childWorkflowTestTemplate(
  backendName: BackendName,
  {
    delays,
    secrets,
  }: {
    delays: {
      awaitCompleteSec: number;
    };
    secrets?: Record<string, string>;
  },
  cleanup?: MetaTestCleanupFn,
) {
  Meta.test(
    {
      name: `Child workflows (${backendName})`,
    },
    async (t) => {
      Deno.env.set("SUB_BACKEND", backendName);
      // FIXME: typegate.local not available through workers when using ctx.gql on tests?
      Deno.env.set("TEST_OVERRIDE_GQL_ORIGIN", `http://localhost:${t.port}`);

      cleanup && t.addCleanup(cleanup);

      const e = await t.engine(
        "runtimes/substantial/substantial_child_workflow.py",
        {
          secrets,
        },
      );

      const packages = [
        { name: "metatype", version: 1 },
        { name: "substantial", version: 2 },
        { name: "typegraph", version: 3 },
      ];

      let parentRunId: string | null = null;
      t.should(`start parent workflow`, async () => {
        await gql`
          mutation {
            start(kwargs: { packages: $packages })
          }
        `
          .withVars({ packages })
          .expectBody((body) => {
            parentRunId = body.data?.start! as string;
            assertExists(
              parentRunId,
              "Run id was not returned when workflow was started",
            );
          })
          .on(e);
      });

      await sleep(delays.awaitCompleteSec * 1000);

      t.should(`complete parent and all child workflows`, async () => {
        await gql`
          query {
            children: results_raw(name: "bumpPackage") {
              ongoing {
                count
              }
              completed {
                count
              }
            }
            parent: results_raw(name: "bumpAll") {
              ongoing {
                count
              }
              completed {
                runs {
                  run_id
                  result {
                    status
                    value
                  }
                }
              }
            }
          }
        `
          .expectData({
            children: {
              ongoing: {
                count: 0,
              },
              completed: {
                count: packages.length,
              },
            },
            parent: {
              ongoing: {
                count: 0,
              },
              completed: {
                runs: [
                  {
                    run_id: parentRunId,
                    result: {
                      status: "COMPLETED",
                      value: JSON.stringify([
                        "Bump metatype v1 => v2",
                        "Bump substantial v2 => v3",
                        "Bump typegraph v3 => v4",
                      ]),
                    },
                  },
                ],
              },
            },
          })
          .on(e);
      });
    },
  );
}

// TODO:
// mock a very basic http server in another process that counts the number of request made by a workflow
// This will allow..
// - Emulating/keeping track of 'natural' retries, timeout
// - Checking if a resolved save makes new requests after interrupts
