// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { execSync } from "node:child_process";
import { LinearClient } from "@linear/sdk";

const apiKey = process.env.LINEAR_API_KEY;

let metaTeam, linearClient;

async function getIssue(number) {
  if (!linearClient) {
    linearClient = new LinearClient({ apiKey });
    metaTeam = await linearClient.team("MET");
  }

  const issues = await metaTeam.issues({
    filter: {
      number: { eq: number },
    },
  });

  return issues.nodes[0];
}

function getAdditions(diff) {
  const [header, ...changes] = diff.split("\n");
  const [_, match] = header.match(/\+(\d+)/);
  const startLine = parseInt(match);
  return changes
    .filter((c) => c.startsWith("+"))
    .map((addition, i) => ({
      addition: addition.slice(1),
      line: startLine + i,
    }));
}

const command = "git diff --color=never --unified=0 main...HEAD";
const output = execSync(command, { encoding: "utf-8" });

const fileAdditions = output
  .split(/(?=^diff --git)/m)
  .map((file) => file.split(/(?=^@@)/m))
  .map((blocks) => {
    const [header, ...diffs] = blocks;
    const [_, fileName] = header.match(/^\+\+\+ b\/(.+)/m);
    const additions = diffs.flatMap((d) => getAdditions(d));
    return { fileName, additions };
  });

const issues = fileAdditions.flatMap(({ fileName, additions }) =>
  additions
    .map(({ addition, line }) => {
      const [_, type, desc] = addition.match(/(TODO|FIXME):? (.+)/) ?? [];
      const [__, match] = desc ? (desc.match(/MET-(\d+)/) ?? []) : [];
      const ticket = match && parseInt(match);
      return { file: fileName, type, desc, line, ticket, source: addition };
    })
    .filter((issue) => issue.desc),
);

let foundInvalidIssue = false;

for (const issue of issues) {
  const { file, type, desc, line, ticket, source } = issue;

  if (!issue.ticket) {
    console.error(
      `Error: A Linear ticket was not found for the issue "${type}: ${desc}" in the file "${file}" at line ${line}.`,
      "Consider creating a Linear ticket for this issue and referencing it in the comment.",
    );
    console.error(`${line} | ${source}`);
    foundInvalidIssue = true;
  } else {
    const issue = await getIssue(ticket);

    if (!issue) {
      console.error(
        `Error: The ticket MET-${ticket} referenced in the file "${file}" at line ${line} does not exist`,
      );
      console.error(`${line} | ${source}`);
      foundInvalidIssue = true;
    } else {
      console.info(
        `Info: Found a Linear ticket "MET-${ticket}" in the file "${file}" at line ${line} (${type}: ${desc})`,
      );
    }
  }
}

if (!issues.length) {
  console.log("No issues or tickets found");
} else if (foundInvalidIssue) {
  process.exit(1);
}
