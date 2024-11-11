// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

/* eslint-disable @typescript-eslint/no-var-requires */

import React from "react";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";
import Heading from "@theme/Heading";
import CodeBlock from "@theme-original/CodeBlock";
import Link from "@docusaurus/Link";

export default function Features(props: {
  rows: (
    | React.JSX.Element
    | FeatureDeets
    | {
      content: string;
      path: string;
    }
  )[][];
}): JSX.Element {
  return (
    <div>
      {props?.rows?.map((row) => (
        <div className="gap-4 flex max-w-full my-10">
          {row.map((item) => {
            if ("title" in item) {
              return (
                <div className="flex-1 w-full">
                  <Feature {...item} />
                </div>
              );
            }
            if ("content" in item) {
              const split = item.path.split(".");
              const lang = split[split.length - 1];
              return (
                <div className="flex-1 w-full">
                  <Link
                    to={`https://github.com/metatypedev/metatype/blob/main/${item.path}`}
                    className={"absolute top-0 right-0 m-2 p-1"}
                  >
                    {item.path.split("/").pop()} ↗
                  </Link>
                  <CodeBlock language={lang} wrap>
                    {item.content}
                  </CodeBlock>
                </div>
              );
            }
            return <div className="flex-1 w-full">{item}</div>;
          })}
        </div>
      ))}
    </div>
  );
}

type FeatureDeets = {
  title: React.JSX.Element | string;
  status: "complete" | "beta" | "future";
  body: React.JSX.Element;
  link: string;
};

function Feature(props: FeatureDeets) {
  const statusColor = {
    complete: "text-green-500",
    beta: "text-yellow-500",
    future: "text-pink-500",
  };
  return (
    <Link
      to={props.link}
      style={{
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div className="flex flex-col gap-1">
        <div className="flex gap-2 justify-between">
          <Heading as="h3" className="inline-block">
            {props.title}
          </Heading>
          <span className={`text-right ${statusColor[props.status]}`}>
            {props.status.toUpperCase()}
          </span>
        </div>
        <div>{props.body}</div>
      </div>
    </Link>
  );
}
