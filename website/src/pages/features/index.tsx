// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

/* eslint-disable @typescript-eslint/no-var-requires */

import React from "react";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";
import Heading from "@theme/Heading";
import CodeBlock from "@theme-original/CodeBlock";
import Link from "@docusaurus/Link";

export default function FeaturesRoadmap(
  props: {
    rows: (React.JSX.Element | FeatureDeets | {
      content: string;
      path: string;
    })[][];
  },
): JSX.Element {
  return (
    <div>
      {props.rows.map((row) => (
        <div className="gap-2 flex">
          {row.map(
            (item) => {
              if ("title" in item) {
                return <Feature {...item} />;
              }
              if ("content" in item) {
                const split = item.path.split(".");
                const lang = split[split.length - 1];
                return (
                  <div>
                    <Link
                      href={`https://github.com/metatypedev/metatype/blob/main/${item.path}`}
                      className={"absolute top-0 right-0 m-2 p-1"}
                    >
                      {item.path.split("/").pop()} ↗
                    </Link>
                    <CodeBlock
                      language={lang}
                      wrap
                      className="flex-1"
                    >
                      {item.content}
                    </CodeBlock>
                  </div>
                );
              }
              return <div className="flex-1">{item}</div>;
            },
          )}
        </div>
      ))}
    </div>
  );
}

type FeatureDeets = {
  title: string;
  status: "complete" | "beta" | "future";
  body: React.JSX.Element;
};
function Feature(props: FeatureDeets) {
  const statusColor = {
    complete: "text-green-500",
    beta: "text-yellow-500",
    future: "text-pink-500",
  };
  return (
    <div className="flex-1 flex flex-col gap-1">
      <div className="flex gap-2">
        <Heading as="h3">{props.title}</Heading>
        <span
          className={`${statusColor[props.status]}`}
        >
          {props.status.toUpperCase()}
        </span>
      </div>
      {props.body}
    </div>
  );
}
