// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

interface Count_votesInput {
  votes: Array<null | "red" | "blue" | "green" | "purple">;
}

export function count_votes(
  { votes }: Count_votesInput,
  { context: _ }: { context: Record<string, unknown> },
): {
  blue: number;
  red: number;
  green: number;
  purple: number;
  blank: number;
} {
  const votesCounter = { red: 0, blue: 0, green: 0, purple: 0, blank: 0 };

  for (const vote of votes) {
    if (vote != null) {
      votesCounter[vote] += 1;
    } else {
      votesCounter["blank"] += 1;
    }
  }

  return votesCounter;
}

interface Sort_votesInput {
  votes: Array<null | "red" | "blue" | "green" | "purple">;
}

export function sort_votes(
  { votes }: Sort_votesInput,
  { context: _ }: { context: Record<string, unknown> },
): Array<null | "red" | "blue" | "green" | "purple"> {
  return votes.sort();
}
