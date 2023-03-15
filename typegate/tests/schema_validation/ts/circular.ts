// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

type Stars = { count: string };
type Medals = { title: string; count: number };

type Award = Stars | Medals;
type Paper = { title: string; author: User };
type User = {
  name: string;
  professor: User | undefined;
  paper: Paper | undefined;
  parents: User[];
  friends: User[] | undefined;
  award: Award | undefined;
  root: unknown | undefined; // test field for nested structs
};

type Input = {
  user: User;
};

type Output = {
  message: string;
  user: User;
};

export function registerUser(
  { user }: Input,
  { context: _ }: { context: Record<string, unknown> },
): Output {
  return {
    message: `${user.name} registered`,
    user: user,
  };
}
