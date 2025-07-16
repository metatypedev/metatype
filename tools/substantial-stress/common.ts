// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

async function gql(
  url: string,
  query: string,
  variables: Record<string, unknown>,
  // deno-lint-ignore no-explicit-any
): Promise<Record<string, any>> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: Object.fromEntries(
        Object.entries(variables)
          .filter(([_, v]) => v !== undefined),
      ),
    }),
  });

  if (!res.ok) {
    throw new Error(
      `GraphQL request failed with status ${res.status}: ${await res.text()}`,
    );
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

export class WorkflowClient {
  public runs = new Set<string>();
  constructor(
    private tgUrl: string,
    public workflow: string,
    private expose: { mutStart: string; qResults: string },
  ) {}

  async start(
    kwargs: unknown,
    includeName = true,
  ): Promise<string> {
    const runId = (await gql(
      this.tgUrl,
      `
      mutation {
        ${this.expose.mutStart}(${
        includeName ? "name: $name, " : ""
      } kwargs: $kwargs)
      }
    `,
      {
        kwargs,
        name: includeName ? this.workflow : undefined,
      },
    ))?.[this.expose.mutStart] as string;
    this.runs.add(runId);

    return runId;
  }

  async status() {
    return (await gql(
      this.tgUrl,
      `
      query Status($name: String) {
        status: ${this.expose.qResults}(name: $name) {
          ongoing {
            count
            runs {
              run_id
              logs { timestamp level value }
            }
          }
          completed {
            count
            runs {
              run_id
              result { status value }
              logs { timestamp level value }
            }
          }
        }
    }
    `,
      {
        name: this.workflow,
      },
    ))?.status;
  }

  async countOngoing() {
    return (await this.status())?.ongoing?.count;
  }

  async countCompleted() {
    return (await this.status())?.completed?.count;
  }
}
