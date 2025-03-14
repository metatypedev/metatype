// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import React, { useMemo, useState } from "react";
import { createGraphiQLFetcher } from "@graphiql/toolkit";
import BrowserOnly from "@docusaurus/BrowserOnly";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import CodeBlock from "@theme-original/CodeBlock";
import Link from "@docusaurus/Link";

import {
  GraphiQLProvider,
  ResponseEditor,
  Spinner,
  useExecutionContext,
} from "@graphiql/react";
import GraphiQLInterface, { Panel } from "./graphiql";
import * as ast from "graphql/language/ast";
import { MemoryStorage } from "./memory_store";
import { ChoicePicker } from "../ChoicePicker";
import { SDK, useSDK } from "../../states/sdk";
import TabItem from "@theme/TabItem";

export interface MiniQLProps {
  code?: Array<{
    content: string;
    codeLanguage?: string;
    codeFileUrl?: string;
  }>;
  typegraph?: string;
  query?: ast.DocumentNode;
  headers?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  panel?: Panel;
  noTool?: boolean;
  defaultMode?: keyof typeof modes | null;
  disablePlayground?: boolean;
}

function Loader() {
  const ec = useExecutionContext({ nonNull: true });
  return ec.isFetching ? <Spinner /> : null;
}

const modes = {
  typegraph: "Typegraph",
  playground: "Playground",
};

function MiniQLBrowser({
  typegraph,
  query,
  code,
  headers = {},
  variables = {},
  panel = "",
  noTool = false,
  defaultMode = null,
  disablePlayground = false,
}: MiniQLProps) {
  const {
    siteConfig: {
      customFields: { tgUrl },
    },
  } = useDocusaurusContext();

  const storage = useMemo(() => new MemoryStorage(), []);

  const fetcher = useMemo(
    () =>
      createGraphiQLFetcher({
        url: `${tgUrl}/${typegraph}`,
      }),
    [],
  );

  const [mode, setMode] = useState(defaultMode);
  const [sdk, setSDK] = useSDK();

  // console.log(code);
  return (
    <div className="@container miniql mb-4">
      {defaultMode && !disablePlayground ? (
        <ChoicePicker choices={modes} choice={mode!} onChange={setMode} />
      ) : null}
      <div
        className={`${
          defaultMode || disablePlayground ? "" : "md:grid @2xl:grid-cols-2"
        } gap-2 w-full order-first`}
      >
        {disablePlayground || !defaultMode || mode === "typegraph" ? (
          <div className=" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0 relative">
            <ChoicePicker
              // if only a single code file is given, we show it
              // despite the set sdk value
              choices={Object.fromEntries(
                code?.map((lang) => [
                  lang.codeLanguage ?? "default",
                  {
                    typescript: "Typescript",
                    python: "Python",
                    rust: "Rust",
                  }[lang.codeLanguage!] ?? "Default",
                ]) ?? [
                  ["typescript", "Typescript"],
                  ["python", "Python"],
                  ["rust", "Rust"],
                ],
              )}
              choice={
                code && code.length < 2
                  ? ((code[0].codeLanguage ?? "default") as SDK)
                  : sdk
              }
              onChange={setSDK}
              className="ml-2"
            >
              {code?.map((lang) => (
                <TabItem key={lang.codeLanguage} value={lang.codeLanguage}>
                  <Link
                    href={`https://github.com/metatypedev/metatype/blob/main/${lang?.codeFileUrl}`}
                    className={"absolute top-0 right-0 m-2 p-1"}
                  >
                    {lang?.codeFileUrl?.split("/").pop()} ↗
                  </Link>
                  <CodeBlock
                    language={lang?.codeLanguage}
                    wrap
                    className="flex-1"
                  >
                    {lang.content}
                  </CodeBlock>
                </TabItem>
              ))}
            </ChoicePicker>
          </div>
        ) : null}
        {!disablePlayground && (!defaultMode || mode === "playground") ? (
          <GraphiQLProvider
            fetcher={fetcher}
            defaultQuery={query!.loc?.source.body.trim()}
            defaultHeaders={JSON.stringify(headers)}
            shouldPersistHeaders={true}
            variables={JSON.stringify(variables)}
            storage={storage}
          >
            <div className="flex flex-col graphiql-container">
              <div className="flex-1 graphiql-session">
                <GraphiQLInterface defaultTab={panel} noTool={noTool} />
              </div>

              <div className="flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg">
                <Loader />
                <ResponseEditor />
              </div>
            </div>
          </GraphiQLProvider>
        ) : null}
      </div>
    </div>
  );
}

export default function MiniQL(props: MiniQLProps) {
  return (
    <BrowserOnly fallback={<div>Loading...</div>}>
      {() => <MiniQLBrowser {...props} />}
    </BrowserOnly>
  );
}
