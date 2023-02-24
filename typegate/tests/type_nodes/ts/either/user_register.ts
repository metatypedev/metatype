// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

interface Regist_userInput {
  user: {
    school: string;
    age: number;
    name: string;
  } | {
    age: number;
    name: string;
    college: string;
  } | {
    company: string;
    age: number;
    name: string;
  };
}

export function regist_user(
  { user }: Regist_userInput,
  { context: _ }: { context: Record<string, unknown> },
): {
  user_id: string;
  date: string;
} | {
  reason: string;
} {
  const success_transaction = {
    user_id: user.name,
    date: "2023-01-01",
  };
  return success_transaction;
}
