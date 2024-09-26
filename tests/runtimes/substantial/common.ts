import { assertExists, assertEquals } from "@std/assert";
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
  cleanup?: MetaTestCleanupFn
) {
  Meta.test(
    {
      name: `Substantial runtime and workflow execution lifecycle (${backendName})`,
    },
    async (t) => {
      Deno.env.set("SUB_BACKEND", backendName);
      cleanup && t.addCleanup(cleanup);

      const e = await t.engine("runtimes/substantial/substantial.py", {
        secrets,
      });

      let currentRunId: string | null = null;
      await t.should(
        `start a workflow and return its run id (${backendName})`,
        async () => {
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
        }
      );

      // This is arbitrary
      // Depends on the tick interval, the timing, and other overheads
      await sleep(delays.awaitSleepCompleteSec * 1000);

      await t.should(
        `have workflow marked as ongoing (${backendName})`,
        async () => {
          await gql`
            query {
              results {
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
        }
      );

      await sleep(3 * 3000);

      await t.should(`complete sleep workflow (${backendName})`, async () => {
        await gql`
          query {
            results {
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
      });
    }
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
  cleanup?: MetaTestCleanupFn
) {
  Meta.test(
    {
      name: `Events and concurrent runs (${backendName})`,
    },
    async (t) => {
      Deno.env.set("SUB_BACKEND", backendName);
      cleanup && t.addCleanup(cleanup);

      const e = await t.engine("runtimes/substantial/substantial.py", {
        secrets,
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
        }
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
              three: abort_email_confirmation(run_id: $three_run_id)
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
              three: runIds[2],
            })
            .on(e);
        }
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
            email_results {
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
              body?.data?.email_results?.ongoing?.count,
              0,
              "0 workflow currently running"
            );

            assertEquals(
              body?.data?.email_results?.completed?.count,
              3,
              "3 workflows completed"
            );

            const localSorter = (a: any, b: any) =>
              a.run_id.localeCompare(b.run_id);

            const received =
              body?.data?.email_results?.completed?.runs ?? ([] as Array<any>);
            const expected = [
              {
                result: {
                  status: "COMPLETED",
                  value: 'Email sent to one@example.com: "confirmed!"',
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
              "All three workflows have completed, including the aborted one"
            );
          })
          .on(e);
      });
    }
  );
}
