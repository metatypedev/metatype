// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

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
import GraphiQLInterface, { Tab } from "./graphiql";
import * as ast from "graphql/language/ast";
import { MemoryStorage } from "./memory_store";
import { ChoicePicker } from "../ChoicePicker";

export interface MiniQLProps {
  typegraph: string;
  query: ast.DocumentNode;
  code?: Array<{
    content: string, 
    codeLanguage?: string;
    codeFileUrl?: string;
  }>;
  headers?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  tab?: Tab;
  noTool?: boolean;
  defaultMode?: keyof typeof modes | null;
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
  tab = "",
  noTool = false,
  defaultMode = null,
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
    []
  );

  const [mode, setMode] = useState(defaultMode);

  return (
    <div className="@container miniql mb-5">
      {defaultMode ? (
        <ChoicePicker
          name="mode"
          choices={modes}
          choice={mode}
          onChange={setMode}
          className="mb-2"
        />
      ) : null}

      <GraphiQLProvider
        fetcher={fetcher}
        defaultQuery={query.loc?.source.body.trim()}
        defaultHeaders={JSON.stringify(headers)}
        shouldPersistHeaders={true}
        variables={JSON.stringify(variables)}
        storage={storage}
      >
        <div
          className={`${
            defaultMode ? "" : "md:grid @2xl:grid-cols-2"
          } gap-2 w-full order-first`}
        >
          {!defaultMode || mode === "typegraph" ? (
            code?.map(lang => 
                <div className=" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0">
                  {lang?.codeFileUrl ? (
                    <div className="p-2 text-xs font-light">
                      See/edit full code on{" "}
                      <Link
                        href={`https://github.com/metatypedev/metatype/blob/main/${lang?.codeFileUrl}`}
                      >
                        {lang?.codeFileUrl}
                      </Link>
                    </div>
                  ) : null}
                  {lang ? (
                    <CodeBlock language={lang?.codeLanguage} wrap className="flex-1">
                      {lang.content}
                    </CodeBlock>
                  ) : null}
                </div>
            )

          ) : null}
          {!defaultMode || mode === "playground" ? (
            <div className="flex flex-col graphiql-container">
              <div className="flex-1 graphiql-session">
                <GraphiQLInterface defaultTab={tab} noTool={noTool} />
              </div>

              <div className="flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg">
                <Loader />
                <ResponseEditor />
              </div>
            </div>
          ) : null}
        </div>
      </GraphiQLProvider>
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
