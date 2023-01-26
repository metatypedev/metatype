// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

interface Get_workerInput {
  id: string;
}

type Get_workerOutput = {
  id: string;
  age: number;
  name: string;
} & {
  company: string;
};

export function get_worker(
  { id }: Get_workerInput,
  { context: _ }: { context: Record<string, unknown> },
): Get_workerOutput {
  return { age: 30, name: "Worker 1", company: "The Company", id };
}
