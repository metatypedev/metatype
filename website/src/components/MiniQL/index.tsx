// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import React, { useMemo } from "react";
import { createGraphiQLFetcher } from "@graphiql/toolkit";
import BrowserOnly from "@docusaurus/BrowserOnly";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import CodeBlock from "@theme-original/CodeBlock";

import {
  GraphiQLProvider,
  ResponseEditor,
  Spinner,
  useExecutionContext,
} from "@graphiql/react";
import GraphiQLInterface, { Tab } from "./GraphiQLInterface";
import * as ast from "graphql/language/ast";
import { MemoryStorage } from "./MemoryStore";
import styles from "./styles.module.scss";

export interface MiniQLProps {
  typegraph: string;
  query: ast.DocumentNode;
  code?: string;
  codeLanguage?: string;
  codeFileUrl?: string;
  headers?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  tab?: Tab;
}

function Loader() {
  const ec = useExecutionContext({ nonNull: true });
  return ec.isFetching ? <Spinner /> : null;
}

export default function MiniQL({
  typegraph,
  query,
  code,
  codeLanguage,
  codeFileUrl,
  headers = {},
  variables = {},
  tab = "",
}: MiniQLProps) {
  const {
    siteConfig: {
      customFields: { tgUrl },
    },
  } = useDocusaurusContext();

  const storage = useMemo(() => new MemoryStorage(), []);

  return (
    <BrowserOnly fallback={<div>Loading...</div>}>
      {() => {
        const fetcher = useMemo(
          () =>
            createGraphiQLFetcher({
              url: `${tgUrl}/${typegraph}`,
            }),
          []
        );
        return (
          <GraphiQLProvider
            fetcher={fetcher}
            defaultQuery={query.loc.source.body.trim()}
            defaultHeaders={JSON.stringify(headers)}
            variables={JSON.stringify(variables)}
            storage={storage}
          >
            <div className="mb-6">
              <div className={`graphiql-container ${styles.container}`}>
                {code ? (
                  <div className={`graphiql-response ${styles.panel}`}>
                    <CodeBlock language={codeLanguage}>{code}</CodeBlock>
                  </div>
                ) : null}

                <div className={`graphiql-session ${styles.editor}`}>
                  <GraphiQLInterface defaultTab={tab} />
                </div>
                <div className={`graphiql-response ${styles.response}`}>
                  <Loader />
                  <ResponseEditor />
                </div>
              </div>
              {codeFileUrl ? (
                <small className="mx-2">
                  See/edit full code on{" "}
                  <a
                    href={`https://github.com/metatypedev/metatype/blob/main/${codeFileUrl}`}
                  >
                    {codeFileUrl}
                  </a>
                </small>
              ) : null}
            </div>
          </GraphiQLProvider>
        );
      }}
    </BrowserOnly>
  );
}
