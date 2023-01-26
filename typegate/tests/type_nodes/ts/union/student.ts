// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

interface Get_studentInput {
  id: string;
}

type Get_studentOutput = {
  id: string;
  age: number;
  name: string;
} & {
  school: string;
};

export function get_student(
  { id }: Get_studentInput,
  { context: _ }: { context: Record<string, unknown> },
): Get_studentOutput {
  return { id, name: "Student 1", age: 14, school: "The School" };
}
